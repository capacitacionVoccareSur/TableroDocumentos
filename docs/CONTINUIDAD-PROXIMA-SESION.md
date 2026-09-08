# Continuidad para la próxima sesión

Última actualización: 4 de septiembre de 2026.

## Resumen del proyecto

Portal interno de Voccare para el área de Capacitación Nodo Sur. Su finalidad es publicar documentos de Google Docs organizados por país y cuenta, para que los agentes puedan abrirlos, revisarlos o firmarlos.

No es un repositorio general de capacitación, un gestor de plantillas ni una vista de las tareas diarias del capacitador.

## Estado actual

- Aplicación React creada con Vite.
- Experiencia fija de una sola pantalla, sin desplazamiento general.
- Escena interactiva en Three.js con modelos 3D de los países.
- Navegación lateral y controles anterior/siguiente.
- Giro arrastrable limitado para explorar el modelo.
- Fondo claro con apariencia atmosférica.
- Iluminación y sombras suaves.
- Banderas aplicadas a los modelos y detrás de los títulos.
- Ecuador se representa en amarillo.
- Argentina incorpora el sol en el centro de la bandera.
- Al seleccionar un país, los demás pierden protagonismo mediante un efecto de desaturación/fade.
- Panel derecho con búsqueda, estados y enlaces directos a Google Docs.
- Formulario interno para cargar documentos sin editar código.
- El portal comienza sin documentos ficticios o de prueba.

## Países disponibles

- Argentina
- Bolivia
- Chile
- Ecuador
- Paraguay
- Perú
- Uruguay

Sus identificadores internos están definidos en `src/data.js`.

## Carga de documentos

La forma recomendada durante la prueba es utilizar el botón **Cargar documento** en la barra superior.

El formulario solicita:

- país;
- cuenta;
- título del documento;
- enlace de Google Docs;
- estado.

Solo acepta enlaces cuyo dominio sea `docs.google.com`. Al publicar, el documento aparece inmediatamente en el país seleccionado.

Las publicaciones creadas desde el formulario muestran un botón de papelera para eliminarlas. Los documentos incorporados directamente en el código no muestran ese control.

## Persistencia local

La carga actual utiliza `localStorage` con la clave:

```text
voccare-documents-v2
```

Consecuencias de esta modalidad:

- los registros permanecen al cerrar o actualizar la página;
- solo existen en el navegador y dispositivo donde se cargaron;
- no se comparten con otros agentes o equipos;
- limpiar los datos del navegador elimina las publicaciones;
- todavía no existe autenticación ni almacenamiento centralizado.

## Datos iniciales

`src/data.js` conserva:

- la lista y metadatos de países;
- los estados disponibles;
- un arreglo `updates` vacío.

Todos los documentos ficticios anteriores fueron eliminados. La aplicación también cambió de la antigua clave local a `voccare-documents-v2`, por lo que las cargas de prueba anteriores dejaron de mostrarse.

## Estados disponibles

| Valor interno | Texto completo | Texto breve |
| --- | --- | --- |
| `signature` | Pendiente de firma | Firma |
| `review` | Pendiente de revisión | Revisión |
| `new` | Nueva cuenta | Nueva |
| `done` | Completado | Listo |

## Archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `src/App.jsx` | Interfaz, navegación, formulario, búsqueda y persistencia local |
| `src/ThreeMap.jsx` | Escena 3D, geometrías, interacción, cámara, materiales e iluminación |
| `src/data.js` | Países, publicaciones iniciales y estados |
| `src/styles.css` | Diseño visual, banderas, responsive, panel y formulario modal |
| `docs/CARGA-MANUAL.md` | Instrucciones de carga desde la web y alternativa mediante código |
| `docs/AVANCE-E-INTEGRACION.md` | Investigación sobre la integración futura con Google Sheets |

## Ajustes visuales recientes

- El modelo se desplazó hacia la derecha para evitar que choque con el título.
- Los modelos 3D se hicieron más delgados y se elevaron ligeramente.
- Se aclaró la paleta general y se abandonó el fondo verde oscuro dominante.
- Se suavizaron bordes y sombras.
- El nombre del país en el panel derecho aumentó de tamaño.
- La bandera del país aparece como fondo tenue detrás del título.
- El nombre de la cuenta dentro de cada documento aumentó de `7px` a `9px`, con peso `600` y mayor separación de letras.

## Investigación para Google Sheets

El proyecto vecino `CapacitacionNodoSur` ya posee una integración con Google Sheets mediante una cuenta de servicio. Utiliza:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`

No debe reutilizarse directamente el endpoint `GET /api/tareas`, porque entrega información de la hoja `Trabajo pendiente`, donde se mezclan documentos y tareas operativas privadas.

La opción recomendada es crear una pestaña separada llamada `Portal agentes`, con campos como:

| Campo | Finalidad |
| --- | --- |
| Publicar | Permitir o impedir que la fila sea visible |
| País | Asociar el documento a un país |
| Cuenta | Identificar la cuenta o campaña |
| Título | Nombre mostrado al agente |
| URL | Enlace de Google Docs |
| Estado | Firma, revisión, nueva cuenta o completado |
| Orden | Posición dentro de la lista |

Después se debería crear un endpoint exclusivo, por ejemplo `GET /api/portal-documentos`, que filtre en el servidor únicamente las filas con `Publicar = SÍ`.

## Decisiones de seguridad

- Los documentos permanecen alojados en Google Drive.
- La web guarda únicamente metadatos y enlaces.
- No deben incorporarse credenciales, tokens o claves privadas al frontend.
- Los permisos reales dependen de la configuración de cada Google Docs.
- Antes de publicar, conviene verificar el enlace con una cuenta de agente sin privilegios de propietario.
- Si el portal se aloja públicamente, será necesario evaluar autenticación o restricción de acceso.

## Cómo ejecutar el proyecto

Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

Para verificar la versión de producción:

```bash
npm run build
```

La última compilación terminó correctamente. Vite muestra una advertencia no bloqueante porque el paquete JavaScript supera los 500 kB; Three.js es el principal candidato para una futura separación de código.

## Próximos pasos recomendados

1. Cargar documentos reales desde el formulario y validar el flujo completo.
2. Probar los permisos con cuentas reales de agentes.
3. Revisar si los cinco campos actuales son suficientes.
4. Confirmar si la carga debe estar disponible para todos o solo para el capacitador.
5. Añadir edición de publicaciones locales, además de creación y eliminación.
6. Definir el alojamiento del portal y el mecanismo de acceso interno.
7. Crear la pestaña `Portal agentes` en Google Sheets.
8. Implementar el endpoint seguro y reemplazar `localStorage` por almacenamiento compartido.
9. Dividir el paquete 3D si la velocidad de carga resulta insuficiente al publicarlo.

## Punto exacto para retomar

La siguiente sesión debería comenzar probando la carga de uno o dos documentos reales mediante **Cargar documento**. Con esa prueba se puede decidir si primero conviene mejorar el formulario, implementar edición o avanzar directamente con Google Sheets y autenticación.
