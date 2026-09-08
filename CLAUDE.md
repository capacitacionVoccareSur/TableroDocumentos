# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server at http://localhost:5175 (port is fixed)
npm run build     # production build
npm run preview   # preview production build
```

There is no lint or test script in package.json. The project uses Playwright for browser tests run manually via `node scripts/check-board.mjs` (requires Edge; set `BOARD_URL` env var to override the default port 5175).

## Architecture

Single-page React app with a Three.js 3D cork board as the primary UI. There are no routes and no backend. Documents are stored in Google Sheets and fetched via Apps Script on load. User-added documents POST to the same endpoint and appear immediately.

### Environment variables

- `VITE_SHEETS_URL` — URL of the deployed Apps Script web app (ends in `/exec`). Set in `.env.local`. If not set, documents fall back to `localStorage` under the key `voccare-documents-v2`.

### Source files (`src/`)

- **`main.jsx`** — React root mount
- **`App.jsx`** — All application state and logic. Fetches remote documents from `VITE_SHEETS_URL` on mount (`remote` state). Merges remote + local documents, manages demo mode, pagination by country columns, and renders three modal dialogs (DocumentForm, Search, DocumentDetail). Uses `inert` on the 3D scene while a dialog is open.
- **`CorkBoard.jsx`** — Pure Three.js component. Receives `columns`, `documents`, and callbacks as props. Rebuilds the entire scene on prop change (the `useEffect` dependency array drives full teardown and recreation). Every visible control (add, search, toggle, navigation arrows) is a 3D mesh; invisible HTML `<button>` elements positioned over each mesh handle pointer, touch, and keyboard input. Falls back to a plain HTML list if WebGL fails.
- **`boardMaterials.js`** — Canvas-based procedural texture generators (`surface`, `paperTexture`, `labelTexture`, `noteTexture`, `fiberTexture`, `flagTexture`). Also loads real PBR texture files from `public/textures/` for cork and wood surfaces.
- **`data.js`** — Static data: `countries` array (7 Latin American countries) and `statusMeta` map. The `updates` array was removed; remote documents come from Sheets.

### Data flow

```
Google Sheets (via Apps Script)
    └─> App.jsx fetch on mount (remote state)
            └─> merged with localStorage docs (local state)
                    └─> CorkBoard.jsx (renders 3D scene, fires callbacks)
                            └─> Dialogs in App.jsx (DocumentForm, Search, DocumentDetail)
```

### Adding documents

When `VITE_SHEETS_URL` is configured:
- **Via UI**: "Cargar documento" POSTs to Apps Script → appends row in Sheets → updates `remote` state immediately (optimistic). Visible to all users on next reload.
- **Via Sheets**: add a row directly to the sheet. Visible on next portal load.

When `VITE_SHEETS_URL` is not configured:
- Documents save to `localStorage` only (`local: true`), visible only in that browser, deletable from the portal.

Document URLs must be `https://docs.google.com/` links — validated in `DocumentForm` before saving.

### 3D scene conventions

- The scene is rebuilt entirely whenever `columns`, `documents`, `demo`, or `viewport` changes (no incremental updates).
- Cork, wood, and fiber textures are cached in a `useRef` (sharedRef) for the component lifetime — never recreated on scene rebuild.
- Textures for document sheets are generated lazily (only for the two visible sheets per stack) and disposed when hidden, to limit GPU memory.
- Pixel budget caps: 3 MP on narrow viewports, 9 MP on wider ones. Shadow map is 2048 on mobile, 4096 on desktop. `shadowMap.autoUpdate = false` — computed once after scene setup.
- Camera parallax uses exponential smoothing (`1 - exp(-8·dt)`). Zoom (Z axis) uses a slower ease (`1 - exp(-0.75·dt)`) for a cinematic pull. Respects `prefers-reduced-motion`.
- Pinhole marks use a single `InstancedMesh` (1 draw call for 34 instances).
- Country labels have a canvas-drawn flag pin (`flagTexture`) in the top-left corner.
- All 7 countries are visible from 900 px wide; 4 from 600 px; 2 from 400 px; 1 below that.

### Textures

PBR texture files (Color, NormalGL, Roughness JPGs) for cork and wood are in `public/textures/cork/` and `public/textures/wood/`. All other textures (paper, labels, notes, fiber, flags) are generated at runtime via Canvas 2D.
