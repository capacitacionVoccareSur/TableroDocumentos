import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Plus, Search, X, Trash2 } from 'lucide-react'
import CorkBoard from './CorkBoard'
import { countries, statusMeta } from './data'

const storageKey = 'voccare-documents-v2'
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || ''
const samples = countries.flatMap((country, index) => [
  { id: `sample-${country.id}-1`, country: country.id, account: 'Cuenta Aurora', title: 'Protocolo de atención', status: 'signature', demo: true },
  { id: `sample-${country.id}-2`, country: country.id, account: index % 2 ? 'Cuenta Horizonte' : 'Cuenta Sur', title: index % 2 ? 'Acuerdo de capacitación' : 'Manual de bienvenida', status: index % 2 ? 'review' : 'signature', demo: true },
])
function readDocuments() {
  try { const data = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(data) ? data.filter(d => d && typeof d.id === 'string' && typeof d.title === 'string' && typeof d.account === 'string') : [] }
  catch { return [] }
}
function Dialog({children, onClose, title}) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement, dialog = ref.current
    dialog.querySelector('input, button, select, a')?.focus()
    function key(e) {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const nodes = [...dialog.querySelectorAll('button, input, select, a[href]')], first = nodes[0], last = nodes.at(-1)
      if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last?.focus()}
      else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first?.focus()}
    }
    dialog.addEventListener('keydown', key)
    return () => {dialog.removeEventListener('keydown', key); if(previous?.isConnected) previous.focus()}
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section ref={ref} className="document-dialog" role="dialog" aria-modal="true" aria-label={title}>{children}</section></div>
}
function DocumentForm({country, onClose, onSave}) {
  const [form, setForm] = useState({country, account: '', title: '', url: '', status: 'signature'}), [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    try {const url = new URL(form.url); if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com') throw Error()}
    catch {setError('Pegá un enlace HTTPS válido de Google Docs.'); return}
    if (!form.title.trim() || !form.account.trim()) {setError('Completá la cuenta y el título.'); return}
    try {onSave({...form, title: form.title.trim(), account: form.account.trim()})}
    catch {setError('No se pudo guardar en este navegador. Revisá el espacio disponible y volvé a intentar.')}
  }
  const field = e => {setForm({...form, [e.target.name]: e.target.value}); setError('')}
  return <Dialog onClose={onClose} title="Cargar documento"><header><div><small>NUEVO DOCUMENTO</small><h2>Un lugar en el tablero.</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X/></button></header><form onSubmit={submit}>
    <label>País<select name="country" value={form.country} onChange={field}>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Cuenta<input name="account" value={form.account} onChange={field} placeholder="Nombre de la cuenta" maxLength={90} required/></label>
    <label className="full">Título<input name="title" value={form.title} onChange={field} placeholder="Nombre del documento" maxLength={180} required/></label>
    <label className="full">Enlace de Google Docs<input name="url" type="url" value={form.url} onChange={field} placeholder="https://docs.google.com/document/d/…" required/></label>
    <label className="full">Estado<select name="status" value={form.status} onChange={field}>{Object.entries(statusMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
    {error && <p role="alert" className="error full">{error}</p>}<footer className="full"><small>Se guarda en este navegador.</small><button className="primary" type="submit"><Plus size={16}/> Colocar en el tablero</button></footer>
  </form></Dialog>
}

function columnCount() { return innerWidth >= 900 ? 7 : innerWidth >= 600 ? 4 : innerWidth >= 400 ? 2 : 1 }
export default function App() {
  const [local, setLocal] = useState(readDocuments), [page, setPage] = useState(0), [query, setQuery] = useState('')
  const [remote, setRemote] = useState([])
  const [demo, setDemo] = useState(() => !readDocuments().length)
  const [showForm, setShowForm] = useState(false), [active, setActive] = useState(null), [showSearch, setShowSearch] = useState(false), [error, setError] = useState('')
  const [size, setSize] = useState(columnCount)
  useEffect(() => {
    if (!SHEETS_URL) return
    fetch(SHEETS_URL)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const docs = data
          .filter(d => d && typeof d.country === 'string' && typeof d.title === 'string' && typeof d.account === 'string')
          .map((d, i) => ({...d, id: 'remote-' + i, url: typeof d.url === 'string' ? d.url : ''}))
        setRemote(docs)
        if (docs.length) setDemo(false)
      })
      .catch(() => {})
  }, [])
  useEffect(() => {const resize = () => {const next = columnCount(); if(size !== next) {setSize(next); setPage(0)}}; window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize)}, [size])
  const pageCount = Math.ceil(countries.length / size)
  const columns = useMemo(() => countries.slice(page * size, page * size + size), [page, size])
  const all = useMemo(() => demo ? samples : [...remote, ...local], [demo, remote, local])
  const visible = useMemo(() => all.filter(d => columns.some(c => c.id === d.country)), [all, columns])
  const results = useMemo(() => all.filter(d => (d.title + ' ' + d.account + ' ' + countries.find(c => c.id === d.country)?.name).toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))), [all, query])
  const closeForm = useCallback(() => setShowForm(false), []), closeDoc = useCallback(() => setActive(null), [])
  const closeSearch = useCallback(() => setShowSearch(false), [])
  function save(form) {
    const doc = {...form, title: form.title.trim(), account: form.account.trim()}
    if (SHEETS_URL) {
      fetch(SHEETS_URL, {method: 'POST', body: JSON.stringify(doc)}).catch(() => {})
      setRemote(prev => [...prev, {...doc, id: 'remote-' + Date.now()}])
    } else {
      const next = [...local, {...doc, id: 'local-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now()), local: true}]
      localStorage.setItem(storageKey, JSON.stringify(next)); setLocal(next)
    }
    setDemo(false); setQuery('')
    setPage(Math.floor(countries.findIndex(c => c.id === form.country) / size)); setShowForm(false)
  }
  function remove(id) {
    try {const next = local.filter(d => d.id !== id); localStorage.setItem(storageKey, JSON.stringify(next)); setLocal(next); setActive(null)}
    catch {setError('No se pudo eliminar el documento del almacenamiento local.')}
  }
  return <main className="app-shell">
    <div className="scene-shell" inert={showForm || active || showSearch ? true : undefined}>
      <CorkBoard columns={columns} documents={visible} onOpen={setActive} demo={demo}
        onAdd={() => setShowForm(true)} onSearch={() => {setQuery(''); setShowSearch(true)}}
        onToggleDemo={() => {setDemo(!demo); setPage(0)}}
        onPrevious={page > 0 ? () => setPage(page - 1) : null}
        onNext={page < pageCount - 1 ? () => setPage(page + 1) : null}/>
    </div>
    {showForm && <DocumentForm country={columns[0]?.id || 'argentina'} onClose={closeForm} onSave={save}/>}
    {showSearch && <Dialog title="Buscar documentos" onClose={closeSearch}><header><div><small>FICHERO</small><h2>Buscar documento</h2></div><button className="icon-button" onClick={closeSearch} aria-label="Cerrar"><X/></button></header><div className="search-content"><label className="search"><Search size={18}/><input aria-label="Buscar documentos o países" placeholder="Cuenta, documento o país" value={query} onChange={e => setQuery(e.target.value)}/></label><div className="search-list">{results.map(d => <button key={d.id} onClick={() => {setShowSearch(false); setActive(d)}}><small>{countries.find(c => c.id === d.country)?.name} · {d.account}</small><strong>{d.title}</strong><ArrowUpRight size={16}/></button>)}{!results.length && <p>Sin documentos para esta búsqueda.</p>}</div></div></Dialog>}
    {active && <Dialog onClose={closeDoc} title={active.title}><header><small>{active.demo ? 'DOCUMENTO DE MUESTRA' : countries.find(c => c.id === active.country)?.name}</small><button className="icon-button" onClick={closeDoc} aria-label="Cerrar"><X/></button></header><div className="document-detail"><span className="detail-account">{active.account}</span><h2>{active.title}</h2><span className="detail-status">{statusMeta[active.status]?.label || 'En revisión'}</span><p>{active.demo ? 'Esta hoja permite explorar el diseño del tablero. Cargá un documento para abrir su enlace real.' : 'Abrí el documento en Google Docs para revisarlo y continuar con la firma.'}</p>{error && <p role="alert" className="error">{error}</p>}<footer>{active.local && <button className="delete-button" onClick={() => remove(active.id)}><Trash2 size={15}/> Eliminar</button>}{active.demo ? <button className="primary" onClick={() => {setActive(null); setShowForm(true)}}>Cargar un documento <Plus size={16}/></button> : /^https:\/\/docs\.google\.com\//.test(active.url || '') ? <a className="primary" href={active.url} target="_blank" rel="noreferrer">Abrir en Google Docs <ArrowUpRight size={17}/></a> : <p className="error">El enlace guardado no es válido.</p>}</footer></div></Dialog>}
  </main>
}
