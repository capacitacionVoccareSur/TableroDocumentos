// ============================================================
// Apps Script — Portal Voccare Nodo Sur (v2)
// ============================================================
//
// Soporta: leer, crear, editar y eliminar documentos.
// Cada fila tiene un id único generado por el script.
//
// ------------------------------------------------------------
// PASO 1 — Estructura del Google Sheet
// ------------------------------------------------------------
// Primera fila con exactamente estos encabezados (en orden):
//
//   id | country | account | title | url | status
//
// Valores válidos para "country":
//   argentina, bolivia, chile, ecuador, paraguay, peru, uruguay
//
// Valores válidos para "status":
//   signature, review, new, done
//
// ------------------------------------------------------------
// PASO 2 — Pegar este código en Apps Script
//   (Extensiones → Apps Script desde el Sheet)
// ------------------------------------------------------------

const SHEET_NAME = 'Hoja 1'

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  const rows = sheet.getDataRange().getValues()
  if (rows.length < 2) return respond([])
  const headers = rows[0]
  const data = rows.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] })
      return obj
    })
  return respond(data)
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  const data  = JSON.parse(e.postData.contents)
  const rows  = sheet.getDataRange().getValues()
  const headers = rows[0]
  const idCol   = headers.indexOf('id') + 1  // 1-based

  // ── Eliminar ──────────────────────────────────────────────
  if (data.action === 'delete') {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idCol - 1] === data.id) {
        sheet.deleteRow(i + 1)
        return respond({ ok: true })
      }
    }
    return respond({ ok: false, error: 'not found' })
  }

  // ── Editar ────────────────────────────────────────────────
  if (data.action === 'update') {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idCol - 1] === data.id) {
        const rowNum = i + 1
        headers.forEach((h, col) => {
          if (h !== 'id' && data[h] !== undefined) {
            sheet.getRange(rowNum, col + 1).setValue(data[h])
          }
        })
        return respond({ ok: true })
      }
    }
    return respond({ ok: false, error: 'not found' })
  }

  // ── Crear ─────────────────────────────────────────────────
  const id = Utilities.getUuid()
  sheet.appendRow([
    id,
    data.country  || '',
    data.account  || '',
    data.title    || '',
    data.url      || '',
    data.status   || 'signature'
  ])
  return respond({ ok: true, id })
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// ------------------------------------------------------------
// PASO 3 — Desplegar como Web App
// ------------------------------------------------------------
// Cada vez que modificás el código creá una NUEVA implementación:
//
// 1. Desplegar → Nueva implementación
// 2. Tipo: Aplicación web
// 3. Ejecutar como: Yo (tu cuenta de Google)
// 4. Quién tiene acceso: Cualquier usuario
// 5. Copiá la nueva URL (/exec) y actualizá .env.local
//
// IMPORTANTE: "Nueva implementación" cada vez, no "Administrar".
// Sin nueva implementación los cambios de código NO tienen efecto.
//
// ------------------------------------------------------------
// PASO 4 — Actualizar .env.local
// ------------------------------------------------------------
//
//   VITE_SHEETS_URL=https://script.google.com/macros/s/TU_NUEVO_ID/exec
//
// Y actualizar el secret VITE_SHEETS_URL en GitHub →
// Settings → Secrets and variables → Actions
//
// ------------------------------------------------------------
// SEGURIDAD
// ------------------------------------------------------------
// La URL es la única protección. No publicarla en código abierto.
// Para mayor seguridad se puede agregar un token secreto:
//
//   if (data.token !== 'MI_TOKEN_SECRETO') return respond({ ok: false })
//
