#!/usr/bin/env bash
# Prueba de humo de la imagen del frontend (job docker-build de CI y uso local):
#   bash scripts/docker-smoke.sh <imagen>
# Corre el contenedor con sistema de archivos de solo lectura y comprueba lo que la imagen promete.
set -euo pipefail
# Git Bash en Windows no debe convertir /tmp en una ruta de Windows al llamar a docker.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }

IMAGE="${1:?uso: docker-smoke.sh <imagen>}"
PORT="${SMOKE_PORT:-18080}"
NAME="quipu-fe-smoke-$$"
BASE="http://localhost:${PORT}"
WORK="$(mktemp -d)"

cleanup() {
  docker rm -f "${NAME}" >/dev/null 2>&1 || true
  rm -rf "${WORK}"
}
trap cleanup EXIT

fail() {
  echo "FALLO: $1" >&2
  docker logs "${NAME}" 2>&1 | tail -20 >&2 || true
  exit 1
}

docker run -d --name "${NAME}" --read-only --tmpfs /tmp -p "${PORT}:8080" "${IMAGE}" >/dev/null

for _ in $(seq 1 20); do
  curl -fs -o /dev/null "${BASE}/" && break
  sleep 1
done
curl -fs -o /dev/null "${BASE}/" || fail "el contenedor no responde en ${BASE}/"

[ "$(docker exec "${NAME}" id -u)" != "0" ] || fail "el contenedor corre como root"

curl -fs -D "${WORK}/h" -o "${WORK}/index.html" "${BASE}/"
grep -q '<title>Quipu</title>' "${WORK}/index.html" || fail "/ no devuelve la aplicación (falta <title>Quipu</title>)"
grep -qi '^cache-control: no-cache' "${WORK}/h" || fail "index.html debe llevar Cache-Control: no-cache"
grep -qi '^x-content-type-options: nosniff' "${WORK}/h" || fail "falta X-Content-Type-Options"
grep -qi '^content-security-policy:' "${WORK}/h" || fail "falta Content-Security-Policy"

# La CSP permite el único script en línea de Angular por su hash: si cambia, la página queda sin
# estilos, así que el hash de la CSP debe coincidir con el script real del index.html.
node -e '
const fs = require("fs"), crypto = require("crypto");
const html = fs.readFileSync(process.argv[1], "utf8");
const csp = fs.readFileSync(process.argv[2], "utf8");
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
for (const m of inline) {
  const hash = "sha256-" + crypto.createHash("sha256").update(m[1]).digest("base64");
  if (!csp.includes(`${hash}`)) { console.error("script en línea sin hash en la CSP: " + hash); process.exit(1); }
}
if (/\son[a-z]+=/.test(html)) { console.error("index.html tiene manejadores on*= que la CSP bloquea"); process.exit(1); }
' "${WORK}/index.html" "${WORK}/h" || fail "la CSP no cubre los scripts en línea de index.html (actualizar el hash en nginx.conf)"

code="$(curl -s -o "${WORK}/spa.html" -w '%{http_code}' "${BASE}/login/ruta-que-no-existe")"
[ "${code}" = "200" ] || fail "una ruta de la SPA debe devolver 200, devolvió ${code}"
grep -q '<app-root>' "${WORK}/spa.html" || fail "una ruta de la SPA debe devolver index.html"

code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/no-existe-ABCD1234.js")"
[ "${code}" = "404" ] || fail "un recurso estático inexistente debe devolver 404, devolvió ${code}"

asset="$(grep -o 'main-[A-Z0-9]*\.js' "${WORK}/index.html" | head -1)"
[ -n "${asset}" ] || fail "no se encontró el bundle main-*.js en index.html"
curl -sI "${BASE}/${asset}" | grep -qi '^cache-control: public, max-age=31536000, immutable' \
  || fail "el bundle con hash debe ser inmutable"

echo "docker-smoke OK (${IMAGE})"
