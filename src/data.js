export const countries = [
  { id: 'argentina', code: 'AR', name: 'Argentina' },
  { id: 'bolivia', code: 'BO', name: 'Bolivia' },
  { id: 'chile', code: 'CL', name: 'Chile' },
  { id: 'ecuador', code: 'EC', name: 'Ecuador' },
  { id: 'paraguay', code: 'PY', name: 'Paraguay' },
  { id: 'peru', code: 'PE', name: 'Perú' },
  { id: 'uruguay', code: 'UY', name: 'Uruguay' },
]

// Guía para cargar documentos manualmente: docs/CARGA-MANUAL.md
export const updates = [
]

export const statusMeta = {
  signature: { label: 'Pendiente de firma', short: 'Firma', tone: 'amber' },
  review: { label: 'Pendiente de revisión', short: 'Revisión', tone: 'blue' },
  new: { label: 'Nueva cuenta', short: 'Nueva', tone: 'mint' },
  done: { label: 'Completado', short: 'Listo', tone: 'quiet' },
}
