// ============================================================
// Integración con Google Sheets — Portal Voccare Nodo Sur
// ============================================================
//
// Los documentos del tablero se leen desde un Google Sheet.
// El portal también puede escribir nuevas filas vía doPost.
//
// ------------------------------------------------------------
// PASO 1 — Estructura del Google Sheet
// ------------------------------------------------------------
// Primera fila debe tener exactamente estos encabezados:
//   country | account | title | url | status
//
// Valores válidos para "country":
//   argentina, bolivia, chile, ecuador, paraguay, peru, uruguay
//
// Valores válidos para "status":
//   signature, review, new, done
//
// ------------------------------------------------------------
// PASO 2 — Pegar este código en el editor de Apps Script
//   (Extensiones → Apps Script desde el Sheet)
// ------------------------------------------------------------

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hoja 1')
  const rows = sheet.getDataRange().getValues()
  const headers = rows[0]
  const data = rows.slice(1)
    .filter(row => row[0])
    .map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] })
      return obj
    })
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hoja 1')
  const data = JSON.parse(e.postData.contents)
  sheet.appendRow([
    data.country,
    data.account,
    data.title,
    data.url,
    data.status || 'signature'
  ])
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}

// ------------------------------------------------------------
// PASO 3 — Re-desplegar como Web App (nueva implementación)
// ------------------------------------------------------------
// Cada vez que se modifica el código hay que crear una nueva
// implementación para que los cambios tomen efecto.
//
// 1. Desplegar → Nueva implementación
// 2. Tipo: Aplicación web
// 3. Ejecutar como: Yo (tu cuenta de Google)
// 4. Quién tiene acceso: Cualquier usuario
// 5. Copiar la nueva URL (termina en /exec) y actualizar .env.local
//
// ------------------------------------------------------------
// PASO 4 — Configurar el portal
// ------------------------------------------------------------
// Crear un archivo .env.local en la raíz del proyecto:
//
//   VITE_SHEETS_URL=https://script.google.com/macros/s/TU_ID/exec
//
// Reiniciar el servidor: npm run dev
// En producción: configurar VITE_SHEETS_URL en Vercel/Netlify.
//
// ------------------------------------------------------------
// NOTA — Si la hoja se llama distinto a "Hoja 1"
// ------------------------------------------------------------
// Cambiar el nombre en getSheetByName('Hoja 1') en ambas funciones.
//
// ------------------------------------------------------------
// SEGURIDAD
// ------------------------------------------------------------
// doGet: solo lectura.
// doPost: escritura pública — cualquiera con la URL puede agregar
// filas. Para uso interno donde la URL no es pública, esto es
// aceptable. No exponer la URL en código público o repositorios.
