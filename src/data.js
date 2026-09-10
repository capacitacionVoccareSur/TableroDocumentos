export const countries = [
  { id: 'argentina', code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { id: 'bolivia',   code: 'BO', name: 'Bolivia',   flag: '🇧🇴' },
  { id: 'chile',     code: 'CL', name: 'Chile',     flag: '🇨🇱' },
  { id: 'ecuador',   code: 'EC', name: 'Ecuador',   flag: '🇪🇨' },
  { id: 'paraguay',  code: 'PY', name: 'Paraguay',  flag: '🇵🇾' },
  { id: 'peru',      code: 'PE', name: 'Perú',      flag: '🇵🇪' },
  { id: 'uruguay',   code: 'UY', name: 'Uruguay',   flag: '🇺🇾' },
]

export const statusMeta = {
  done:      { label: 'Completado',         short: 'Completado',  tone: 'done' },
  signature: { label: 'Pendiente de firma', short: 'Pendiente',   tone: 'signature' },
  review:    { label: 'En revisión',        short: 'En revisión', tone: 'review' },
  new:       { label: 'Nueva cuenta',       short: 'Nueva',       tone: 'new' },
}
