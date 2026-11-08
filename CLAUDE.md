# Lineamientos del repositorio

- **Documentación:** se consulta y se mantiene en Confluence (sitio `tarimat-wasi`). No se crea documentación en este repositorio (ni `.md` ni `docs/`). Referenciar páginas por título, nunca por ruta de archivo.
- **Antes de escribir código:** leer "Perfil técnico de Quipu" (espacio Quipu) y las guías del espacio Yachay Wasi que ese perfil adopta ("Guía Angular", "Guía GitHub Actions y calidad de CI", "Política de componentes nuevos").
- **Actividades:** toda tarea vive en Jira (proyecto `TAR`). Ramas, commits y PRs citan la clave (`TAR-12`).
- **Puerta de calidad:** `npm run verify` (con `npm ci --ignore-scripts` y el Node de `.nvmrc`).
- **Revisión y alineación:** ejecutar `/guidelines-review` antes de abrir un PR y `/docs-alignment` al cerrar una fase, antes de un pase a producción y cada vez que cambie una decisión; commits, PRs y comentarios de revisión citan las reglas por su ID.

# Componentes: reutilizar antes de crear

- **Regla:** antes de crear un componente se busca en el catálogo de abajo (y en `src/app/shared` y en la carpeta `components/` del feature) uno igual o parecido. Si existe, se usa; si casi sirve, se extiende o se compone con él; solo si no hay nada se crea, **construido sobre los existentes** (no copiando su HTML ni sus estilos). Así un feature no resuelve de una forma lo que otro resuelve de otra.
- **Todo bloque de interfaz es un componente**, aunque solo lo use un feature: las páginas (`pages/`) orquestan y los bloques viven en `components/` del feature; lo que usan dos o más features, o es genérico, va a `shared/ui` (o `shared/<dominio>`). Las piezas puras (textos, formatos, reglas) van a `model/`.
- **Anfitrión visible:** un componente cuyo `<app-…>` recibe una clase de margen o layout declara `:host { display: block; }`; un elemento personalizado es `inline` por defecto y el margen no se aplica.
- **Carga sin saltos:** cada pantalla pasa de nada → skeleton → datos, nunca por un paso en blanco. El skeleton aparece al instante (`SKELETON_DELAY_MS = 0`), tiene la forma de la pantalla final (mismas vistas, mismos filtros, mismo panel, mismas columnas) y los bloques que pueden faltar en la pantalla final (como el aviso «Ahora») están siempre, con un estado «en orden», para que nada suba ni baje al llegar los datos. Los filtros del skeleton de una lista son `app-list-filters-skeleton`.
- **Barra de desplazamiento:** `html { scrollbar-gutter: stable both-edges }` reserva su sitio a los dos lados; no se anula.
- **Caché:** los archivos con hash de contenido (`main-*.js`, `chunk-*.js`, `styles-*.css`) se sirven con `Cache-Control: public, max-age=31536000, immutable` (`vercel.json` y `nginx.conf`); el `index.html` nunca. Un despliegue nuevo cambia los nombres, así que en dev se actualiza solo. Las rutas se precargan en segundo plano (`PreloadAllModules`) y el arranque no espera al servidor (el token CSRF se pide sin bloquear el render): lo único que espera la pantalla es la API.

## Catálogo de componentes compartidos

Estructura de página y avisos

- `app-page-header` (shared/ui/page-header): título y fecha de Lima de toda página. `app-now-panel`: «Lo que toca ahora» de una lista (cifra, etiqueta, texto y una acción proyectada). `app-page-notice`: aviso de página por tono. `app-load-error`: error de carga con «Reintentar». `app-empty-state`: bloque vacío. `app-fact-tile`: ficha de dato (etiqueta y valor). `app-status-badge`: los cinco estados (pagado, en revisión…). `app-step-list`: pasos de un proceso. `app-toast` / `ToastService`: avisos breves.
- `app-form-summary-layout` (shared/forms): formulario más resumen lateral. `app-auth-shell` (shared/auth-shell): marco de las páginas sin sesión. `app-quipu`: el quipu de la marca. `app-shell` (layout): barra y menú.

Listas

- `app-list-filters`: «Buscar», selects proyectados, «Ordenar por» en móvil y conteo con «Quitar filtros». `app-list-filters-skeleton`: su skeleton (vistas, selects, orden, conteo). `app-list-results`: vacío, sin coincidencias, error y «Mostrar más» de una lista. `app-search-field`: campo «Buscar». `app-show-more`: «Mostrando X de Y». `app-choice-group`: botones segmentados (una opción pulsada). `app-status-filter`: barra de estados con filtro. `PagedList` (shared/data/paged-list.ts): estado de una lista paginada por cursor. `AsyncContentState` (shared/data/async-content.ts): estado de una lectura única (resumen, detalle). `PageLoadState`: contabilidad de páginas.
- `app-data-table` (shared/ui/data-table) con `appDataCell`, `appDataCard`, `appDataFooter`, `appDataSkeletonCard`, `appDataSkeletonCell`: tabla con tarjetas en móvil, orden y skeleton (`[loading]`, `[skeletonBefore]`). `list-sort.ts`: orden de una lista.

Skeleton

- `app-skeleton` + `appSkeletonContent`: región de carga que muestra su contenido al instante y el aviso del servidor lento a los 8 s. Piezas: `app-skeleton-block`, `app-skeleton-fields`, `app-skeleton-facts` (con `[wideFirst]`), `app-skeleton-cards`, `app-list-filters-skeleton`.

Formularios y diálogos

- `app-form-field` + `[appFieldControl]`: etiqueta, control, error y ayuda. `app-file-field`: archivo (JPG, PNG o PDF). `app-new-password-field`, `app-personal-data-fields`: campos que repiten varios formularios. `FieldErrors`, `form-feedback`, `DialogSubmission`, `call-failure`: errores de servidor y envío de diálogos. `app-dialog-frame`: marco visual de todo diálogo. `app-concurrent-modification-dialog` (`openConcurrentModificationDialog`): el registro cambió. `app-payment-notice-dialog` (`openPaymentNoticeDialog`): conflictos de pago. `change-password-action`: abre «Cambiar contraseña».

Pagos (shared/payments)

- `app-proof-kind-choice`, `app-proof-amount-field`, `app-proof-method-field`, `ProofDrafts`, `proof-fields`, `proofs-body`, `proof-rules`: los comprobantes de A5.1, A5.2, H3 y T2. `app-period-payments` y `period-rows`: «Pagos por mes». `payment-format` (dinero, períodos, `limaDay`/`limaMonth`) y `credit-texts`: formatos y textos.

Textos (shared/text)

- `document-text`, `environment-text`, `guest-text`, `file-text`, `error-text`, `search`: cómo se nombra un documento, ambiente, huésped, archivo, error y cómo se busca. Los errores salen del catálogo SRS 17 por `code` (`toBffError`), salvo los que el SRS lista con el texto del BFF.

Por feature: lo específico de un feature (tablas, diálogos, paneles) está en su carpeta `components/` (por ejemplo `app-guests-now-panel`, `app-contracts-table`, `app-movements-table`); se revisa ahí antes de crear otro.

Al agregar o cambiar un componente compartido se actualiza este catálogo en el mismo PR.
