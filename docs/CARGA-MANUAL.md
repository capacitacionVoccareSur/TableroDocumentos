# Carga manual de documentos

## Forma recomendada: desde la web

1. Abrir el portal.
2. Pulsar **Cargar documento** en la barra superior.
3. Elegir el país y completar cuenta, título, enlace y estado.
4. Pulsar **Publicar documento**.

La publicación aparecerá inmediatamente en el país elegido. Las publicaciones creadas así muestran un pequeño botón de papelera que permite eliminarlas.

Durante esta etapa de prueba, la información queda guardada en el almacenamiento local del navegador (`localStorage`). Esto significa que permanece después de cerrar la página, pero solo puede verse en ese navegador y dispositivo. Todavía no se comparte automáticamente con otros usuarios.

## Alternativa: editar el archivo

Las publicaciones están definidas en:

```text
src/data.js
```

Dentro de ese archivo, la constante `updates` contiene la lista de documentos. No es necesario guardar copias de los Google Docs en este repositorio.

## Formato de una publicación

```js
{
  id: 'arg-cuenta-documento-01',
  country: 'argentina',
  account: 'Nombre de la cuenta',
  title: 'Título visible del documento',
  description: 'Indicación breve para el agente.',
  status: 'Requiere firma',
  date: '2026-09-04',
  url: 'https://docs.google.com/document/d/ID_DEL_DOCUMENTO/edit',
  owner: 'Capacitación Nodo Sur',
}
```

Cada `id` debe ser único. Conviene escribirlo en minúsculas, sin espacios ni caracteres especiales.

## Países disponibles

El valor de `country` debe coincidir exactamente con uno de estos identificadores:

- `argentina`
- `chile`
- `colombia`
- `ecuador`
- `mexico`
- `peru`
- `uruguay`

## Estados sugeridos

- `Nuevo`
- `Requiere firma`
- `Actualizado`
- `Solo lectura`

Para mantener una interfaz consistente, es preferible reutilizar estos estados antes de crear variantes con el mismo significado.

## Cómo agregar un documento

1. Crear o abrir el documento en Google Docs.
2. Configurar el permiso apropiado en Google Drive.
3. Copiar el enlace del documento.
4. Abrir `src/data.js`.
5. Agregar un nuevo objeto dentro de `updates`, separado del anterior por una coma.
6. Guardar el archivo y ejecutar `npm run dev` para revisar el resultado.
7. Seleccionar el país correspondiente y probar el enlace.

## Permisos y seguridad

El portal no modifica los permisos de Drive. El enlace funcionará solamente para las personas autorizadas en Google Docs.

Para documentos internos, se recomienda compartirlos con cuentas individuales o con el dominio/grupo corporativo correspondiente. Evitar la opción pública “cualquier persona con el enlace” salvo que sea una decisión consciente.

Antes de publicar, comprobar el acceso con una cuenta de agente que no sea propietaria del archivo. Así se detectan permisos faltantes antes de distribuir el portal.

No deben cargarse en `src/data.js` credenciales, claves privadas, tokens ni información confidencial de tareas internas.
