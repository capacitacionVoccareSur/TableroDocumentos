import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Trash2, Search, ArrowUpRight, Pencil, Loader2 } from 'lucide-react'
import { countries, statusMeta } from './data'

// ─── SVG Flags ────────────────────────────────────────────────────────────────
function Flag({ id, size = 20 }) {
  const w = size * 1.5, h = size
  const shared = { width: w, height: h, viewBox: '0 0 30 20', style: { borderRadius: 2, flexShrink: 0, display: 'block' } }
  switch (id) {
    case 'argentina': return (
      <svg {...shared}><rect width="30" height="20" fill="#74acdf"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><circle cx="15" cy="10" r="3" fill="#f6b40e"/></svg>
    )
    case 'bolivia': return (
      <svg {...shared}><rect width="30" height="6.67" fill="#d52b1e"/><rect y="6.67" width="30" height="6.67" fill="#f4e400"/><rect y="13.33" width="30" height="6.67" fill="#007a3d"/></svg>
    )
    case 'chile': return (
      <svg {...shared}><rect width="30" height="20" fill="#d52b1e"/><rect width="30" height="10" fill="#fff"/><rect width="10" height="10" fill="#0033a0"/><polygon points="5,2.5 6.18,6.09 9.76,6.09 6.9,8.26 8.09,11.85 5,9.68 1.91,11.85 3.1,8.26 0.24,6.09 3.82,6.09" fill="#fff"/></svg>
    )
    case 'ecuador': return (
      <svg {...shared}><rect width="30" height="10" fill="#ffd100"/><rect y="10" width="30" height="5" fill="#003087"/><rect y="15" width="30" height="5" fill="#ce1126"/></svg>
    )
    case 'paraguay': return (
      <svg {...shared}><rect width="30" height="6.67" fill="#d52b1e"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#0038a8"/><circle cx="15" cy="10" r="2.5" fill="none" stroke="#009b3a" strokeWidth="1"/></svg>
    )
    case 'peru': return (
      <svg {...shared}><rect width="30" height="20" fill="#d91023"/><rect x="10" width="10" height="20" fill="#fff"/></svg>
    )
    case 'uruguay': return (
      <svg {...shared}><rect width="30" height="20" fill="#fff"/>{[1,3,5,7].map(i=><rect key={i} y={i*2} width="30" height="2" fill="#74acdf"/>)}<rect width="12" height="10" fill="#fff"/><circle cx="6" cy="5" r="2.5" fill="#f6b40e"/></svg>
    )
    default: return <svg {...shared}><rect width="30" height="20" fill="#ccc"/></svg>
  }
}

const storageKey = 'voccare-documents-v2'
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || ''

function readLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(data) ? data.filter(d => d && typeof d.id === 'string' && typeof d.title === 'string' && typeof d.account === 'string') : []
  } catch { return [] }
}

// ─── Dialog ────────────────────────────────────────────────────────────────────
function Dialog({ children, onClose, title }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement, dialog = ref.current
    dialog.querySelector('input, button, select, a')?.focus()
    function key(e) {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const nodes = [...dialog.querySelectorAll('button, input, select, a[href]')]
      const first = nodes[0], last = nodes.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    dialog.addEventListener('keydown', key)
    return () => { dialog.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus() }
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section ref={ref} className="document-dialog" role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </section>
    </div>
  )
}

// ─── Document Form (crear y editar) ───────────────────────────────────────────
function DocumentForm({ country, onClose, onSave, initial }) {
  const isEdit = !!initial
  const [form, setForm] = useState(
    initial ?? { country, account: '', title: '', url: '', status: 'signature' }
  )
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    try { const url = new URL(form.url); if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com') throw Error() }
    catch { setError('Pegá un enlace HTTPS válido de Google Docs.'); return }
    if (!form.title.trim() || !form.account.trim()) { setError('Completá la cuenta y el título.'); return }
    try { onSave({ ...form, title: form.title.trim(), account: form.account.trim() }) }
    catch { setError('No se pudo guardar. Revisá el espacio disponible.') }
  }
  const field = e => { setForm({ ...form, [e.target.name]: e.target.value }); setError('') }

  return (
    <Dialog onClose={onClose} title={isEdit ? 'Editar documento' : 'Cargar documento'}>
      <header>
        <div>
          <small>{isEdit ? 'EDITAR DOCUMENTO' : 'NUEVO DOCUMENTO'}</small>
          <h2>{isEdit ? 'Editar documento.' : 'Cargar al tablero.'}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
      </header>
      <form onSubmit={submit}>
        <label>País
          <select name="country" value={form.country} onChange={field}>
            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Cuenta
          <input name="account" value={form.account} onChange={field} placeholder="Nombre de la cuenta" maxLength={90} required />
        </label>
        <label className="full">Título
          <input name="title" value={form.title} onChange={field} placeholder="Nombre del documento" maxLength={180} required />
        </label>
        <label className="full">Enlace de Google Docs
          <input name="url" type="url" value={form.url} onChange={field} placeholder="https://docs.google.com/document/d/…" required />
        </label>
        <label className="full">Estado
          <select name="status" value={form.status} onChange={field}>
            {Object.entries(statusMeta).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="error full">{error}</p>}
        <footer className="full">
          <small>{SHEETS_URL ? 'Se guarda en Google Sheets.' : 'Se guarda en este navegador.'}</small>
          <button className="btn-primary" type="submit">
            {isEdit ? <><Pencil size={14} /> Guardar cambios</> : <><Plus size={15} /> Cargar documento</>}
          </button>
        </footer>
      </form>
    </Dialog>
  )
}

// ─── Board Card ────────────────────────────────────────────────────────────────
function BoardCard({ doc, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const meta = statusMeta[doc.status] || statusMeta.signature
  const hasValidUrl = /^https:\/\/docs\.google\.com\//.test(doc.url || '')

  function toggle(e) { e.stopPropagation(); setExpanded(s => !s) }

  return (
    <article
      className={`board-card board-card--${doc.status}${expanded ? ' board-card--expanded' : ''}`}
      onClick={toggle}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && toggle(e)}
      role="button"
      aria-expanded={expanded}
      aria-label={doc.title}
    >
      <div className="board-card-top">
        <span className={`board-dot board-dot--${doc.status}`} />
        <span className="board-card-status">{meta.short}</span>
        <span className="board-card-chevron">{expanded ? '↑' : '↓'}</span>
      </div>
      <p className="board-card-title">{doc.title}</p>
      <p className="board-card-account">{doc.account}</p>

      {expanded && (
        <div className="board-card-detail" onClick={e => e.stopPropagation()}>
          <div className="bcd-divider" />
          <p className="bcd-label">Estado</p>
          <p className="bcd-value">{meta.label}</p>
          <div className="bcd-actions">
            {hasValidUrl && (
              <a className="bcd-action bcd-action--primary" href={doc.url} target="_blank" rel="noreferrer">
                <ArrowUpRight size={12} /> Abrir
              </a>
            )}
            <button className="bcd-action" onClick={() => onEdit(doc)}>
              <Pencil size={12} /> Editar
            </button>
            <button className="bcd-action bcd-action--danger" onClick={() => onDelete(doc)}>
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [local, setLocal]     = useState(readLocal)
  const [remote, setRemote]   = useState([])
  const [loading, setLoading] = useState(!!SHEETS_URL)

  // form state: null = cerrado, string = nuevo con ese país, objeto = editar doc
  const [formState, setFormState] = useState(null)

  const [search, setSearch]       = useState('')
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    if (!SHEETS_URL) return
    fetch(SHEETS_URL)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const docs = data
          .filter(d => d && typeof d.country === 'string' && typeof d.title === 'string' && typeof d.account === 'string')
          .map(d => ({ ...d, id: String(d.id || 'remote-' + Date.now() + Math.random()), url: typeof d.url === 'string' ? d.url : '' }))
        setRemote(docs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const all = useMemo(() => [...remote, ...local], [remote, local])

  const filtered = useMemo(() =>
    search
      ? all.filter(d => (d.title + ' ' + d.account + ' ' + (countries.find(c => c.id === d.country)?.name || ''))
          .toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
      : null
  , [all, search])

  const closeForm = useCallback(() => setFormState(null), [])

  function openNew(countryId) { setFormState(countryId) }
  function openEdit(doc)      { setFormState(doc) }

  async function save(form) {
    const doc = { ...form, title: form.title.trim(), account: form.account.trim() }
    const isEdit = formState && typeof formState === 'object'
    const editId = isEdit ? formState.id : null

    const postOpts = body => ({
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    })

    if (SHEETS_URL) {
      if (editId) {
        fetch(SHEETS_URL, postOpts({ ...doc, action: 'update', id: editId })).catch(() => {})
        setRemote(prev => prev.map(d => d.id === editId ? { ...d, ...doc } : d))
      } else {
        const id = crypto.randomUUID()
        fetch(SHEETS_URL, postOpts({ ...doc, id })).catch(() => {})
        setRemote(prev => [...prev, { ...doc, id }])
      }
    } else {
      if (editId) {
        const next = local.map(d => d.id === editId ? { ...d, ...doc } : d)
        localStorage.setItem(storageKey, JSON.stringify(next))
        setLocal(next)
      } else {
        const next = [...local, { ...doc, id: 'local-' + (crypto.randomUUID?.() ?? Date.now()), local: true }]
        localStorage.setItem(storageKey, JSON.stringify(next))
        setLocal(next)
      }
    }
    setFormState(null)
  }

  function remove(doc) {
    if (SHEETS_URL) {
      fetch(SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id: doc.id }),
      }).catch(() => {})
      setRemote(prev => prev.filter(d => d.id !== doc.id))
    }
    // always clean from local too (covers local: true docs)
    const next = local.filter(d => d.id !== doc.id)
    localStorage.setItem(storageKey, JSON.stringify(next))
    setLocal(next)
  }

  const totalDone      = all.filter(d => d.status === 'done').length
  const totalSignature = all.filter(d => d.status === 'signature').length
  const totalReview    = all.filter(d => d.status === 'review' || d.status === 'new').length

  const isInert = !!formState || showSearch

  // resolve DocumentForm props from formState
  const formProps = formState
    ? typeof formState === 'string'
      ? { country: formState, initial: undefined }
      : { country: formState.country, initial: formState }
    : null

  return (
    <>
    <div className="board-root" inert={isInert ? true : undefined}>

      {/* ── HUD ── */}
      <header className="board-hud">
        <div className="hud-stats">
          {loading
            ? <span className="hud-loading"><Loader2 size={13} className="hud-spinner" /> Cargando…</span>
            : <>
                <span className="hud-stat"><span className="hud-stat-n hud-stat-n--done">{totalDone}</span> completados</span>
                <span className="hud-sep" />
                <span className="hud-stat"><span className="hud-stat-n hud-stat-n--sig">{totalSignature}</span> pendientes</span>
                <span className="hud-sep" />
                <span className="hud-stat"><span className="hud-stat-n hud-stat-n--rev">{totalReview}</span> en revisión</span>
              </>
          }
        </div>
        <div className="hud-actions">
          <button className="hud-btn hud-btn--ghost" onClick={() => setShowSearch(true)} aria-label="Buscar">
            <Search size={14} />
          </button>
          <button className="hud-btn hud-btn--primary" onClick={() => openNew('argentina')}>
            <Plus size={13} /> Cargar
          </button>
        </div>
      </header>

      {/* ── Board columns ── */}
      <div className="board-columns">
        {countries.map(c => {
          const colDocs = (filtered ?? all).filter(d => d.country === c.id)
          const dimmed  = !!filtered && colDocs.length === 0 && all.filter(d => d.country === c.id).length > 0
          return (
            <div key={c.id} className={`board-col${dimmed ? ' board-col--dimmed' : ''}`}>
              <div className="board-col-header">
                <Flag id={c.id} size={16} />
                <span className="board-col-name">{c.name}</span>
              </div>
              <div className="board-col-cards">
                {colDocs.map(doc => (
                  <BoardCard key={doc.id} doc={doc} onEdit={openEdit} onDelete={remove} />
                ))}
                {colDocs.length === 0 && !dimmed && !loading && (
                  <button className="board-col-empty" onClick={() => openNew(c.id)}>
                    + agregar
                  </button>
                )}
                {loading && colDocs.length === 0 && (
                  <p className="board-col-empty board-col-empty--loading">…</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>

    {/* ── Dialogs ── */}
    {showSearch && (
      <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowSearch(false)}>
        <section className="document-dialog" role="dialog" aria-modal="true" aria-label="Buscar documentos">
          <header>
            <div><small>FICHERO</small><h2>Buscar documento</h2></div>
            <button className="icon-button" onClick={() => setShowSearch(false)} aria-label="Cerrar"><X size={18} /></button>
          </header>
          <div className="search-content">
            <label className="search-field">
              <Search size={16} />
              <input
                autoFocus
                type="text"
                placeholder="Cuenta, documento o país…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Buscar documentos"
              />
            </label>
            <div className="search-results">
              {search
                ? all
                    .filter(d => (d.title + ' ' + d.account + ' ' + (countries.find(c => c.id === d.country)?.name || '')).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
                    .map(d => (
                      <button key={d.id} className="search-result-row" onClick={() => { setShowSearch(false); openEdit(d) }}>
                        <span className={`board-dot board-dot--${d.status}`} />
                        <span className="sr-country">{countries.find(c => c.id === d.country)?.name}</span>
                        <span className="sr-title">{d.title}</span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))
                : null
              }
              {search && !all.filter(d => (d.title + ' ' + d.account + ' ' + (countries.find(c => c.id === d.country)?.name || '')).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).length && (
                <p className="search-empty">Sin resultados para &ldquo;{search}&rdquo;</p>
              )}
              {!search && <p className="search-empty">Escribí para buscar…</p>}
            </div>
          </div>
        </section>
      </div>
    )}

    {formProps && (
      <DocumentForm
        country={formProps.country}
        initial={formProps.initial}
        onClose={closeForm}
        onSave={save}
      />
    )}
    </>
  )
}
