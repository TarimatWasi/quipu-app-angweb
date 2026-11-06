# Lineamientos del repositorio

- **Documentación:** se consulta y se mantiene en Confluence (sitio `tarimat-wasi`). No se crea documentación en este repositorio (ni `.md` ni `docs/`). Referenciar páginas por título, nunca por ruta de archivo.
- **Antes de escribir código:** leer "Perfil técnico de Quipu" (espacio Quipu) y las guías del espacio Yachay Wasi que ese perfil adopta ("Guía Angular", "Guía GitHub Actions y calidad de CI", "Política de componentes nuevos").
- **Actividades:** toda tarea vive en Jira (proyecto `TAR`). Ramas, commits y PRs citan la clave (`TAR-12`).
- **Puerta de calidad:** `npm run verify` (con `npm ci --ignore-scripts` y el Node de `.nvmrc`).
- **Revisión y alineación:** ejecutar `/guidelines-review` antes de abrir un PR y `/docs-alignment` al cerrar una fase, antes de un pase a producción y cada vez que cambie una decisión; commits, PRs y comentarios de revisión citan las reglas por su ID.
