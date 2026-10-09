#!/usr/bin/env bash
# Comprobación de salud posterior al despliegue (TAR-167): la portada de <HEALTH_URL> debe responder
# 200 y traer la raíz de la aplicación (<app-root). Un despliegue "listo" no es un sitio que sirve la
# aplicación. Si no se cumple, el script falla y el workflow queda en rojo; la reversión es lanzar el
# workflow con el commit anterior (ver la "Política de entornos y promoción").
set -euo pipefail

base="${HEALTH_URL:?falta HEALTH_URL}"
attempts="${HEALTH_ATTEMPTS:-12}"
pause="${HEALTH_PAUSE_SECONDS:-5}"
url="${base%/}/"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT

for ((i = 1; i <= attempts; i++)); do
  code="$(curl -s -o "$body" -w '%{http_code}' --max-time 30 "$url" || true)"
  if [ "$code" = "200" ] && grep -q '<app-root' "$body"; then
    echo "Salud correcta en el intento $i: $url"
    exit 0
  fi
  echo "Intento $i/$attempts: HTTP $code"
  sleep "$pause"
done

echo "El sitio no quedó sano después de $attempts intentos: $url" >&2
exit 1
