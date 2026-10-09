#!/usr/bin/env bash
# Pruebas del adaptador de Vercel (TAR-167) sin red: un curl falso hace de API de Vercel y deja en
# un archivo lo que recibió. Ejecutar: bash .github/deploy/tests/vercel.test.sh
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
adapter="$here/../providers/vercel.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
failures=0

# Un curl falso: guarda la llamada y responde según el escenario (FAKE_SCENARIO).
mkdir -p "$work/bin"
cat > "$work/bin/curl" <<'FAKE'
#!/usr/bin/env bash
args="$*"
echo "$args" >> "$FAKE_LOG"
body=""
while [ $# -gt 0 ]; do
  case "$1" in -d) body="$2"; shift ;; esac
  shift
done
[ -n "$body" ] && echo "$body" > "$FAKE_BODY"
case "$args" in
  *"-X POST"*"/v13/deployments"*)
    echo '{"id":"dpl_test","readyState":"QUEUED"}' ;;
  *"/v13/deployments/dpl_test"*)
    n=$(cat "$FAKE_COUNT" 2>/dev/null || echo 0); n=$((n + 1)); echo "$n" > "$FAKE_COUNT"
    case "$FAKE_SCENARIO" in
      ok)       if [ "$n" -lt 2 ]; then echo '{"readyState":"BUILDING","aliasAssigned":false}'; else echo '{"readyState":"READY","aliasAssigned":true}'; fi ;;
      error)    echo '{"readyState":"ERROR","aliasAssigned":false}' ;;
      canceled) echo '{"readyState":"CANCELED","aliasAssigned":false}' ;;
      noalias)  echo '{"readyState":"READY","aliasAssigned":false}' ;;
      slow)     echo '{"readyState":"BUILDING","aliasAssigned":false}' ;;
    esac ;;
  *) echo "{}" ;;
esac
FAKE
chmod +x "$work/bin/curl"

run() { # run <escenario> [VAR=valor ...]; deja la salida en $work/out y el código en $code
  local scenario="$1"; shift
  : > "$work/log"; : > "$work/body"; rm -f "$work/count"
  env -i PATH="$work/bin:$PATH" HOME="$work" \
    FAKE_SCENARIO="$scenario" FAKE_LOG="$work/log" FAKE_BODY="$work/body" FAKE_COUNT="$work/count" \
    VERCEL_TOKEN="tok_secreto_no_imprimir" VERCEL_PROJECT_ID="prj_123" VERCEL_TEAM_ID="team_456" \
    VERCEL_PROJECT_NAME="quipu-app-angweb-dev" GITHUB_REPOSITORY="TarimatWasi/quipu-app-angweb" \
    GITHUB_REF_NAME="development" COMMIT_SHA="0123456789abcdef0123456789abcdef01234567" \
    VERCEL_ATTEMPTS=4 VERCEL_PAUSE_SECONDS=0 "$@" \
    bash "$adapter" > "$work/out" 2>&1
  code=$?
}

check() { # check <descripción> <condición verdadera=0>
  if [ "$2" -eq 0 ]; then echo "ok   - $1"; else echo "FALLA - $1"; failures=$((failures + 1)); fi
}

run ok
check "un despliegue que llega a READY con alias termina con éxito" "$code"
grep -q '"sha":"0123456789abcdef0123456789abcdef01234567"' "$work/body"
check "pide desplegar el commit exacto" $?
grep -q '"target":"production"' "$work/body"
check "despliega al entorno de producción del proyecto de Vercel (el de desarrollo de Quipu)" $?
grep -q '"org":"TarimatWasi"' "$work/body" && grep -q '"repo":"quipu-app-angweb"' "$work/body" && grep -q '"ref":"development"' "$work/body"
check "toma organización, repositorio y rama del contexto de GitHub" $?
grep -q '"project":"prj_123"' "$work/body"
check "apunta al proyecto por su id" $?
grep -q 'teamId=team_456' "$work/log"
check "actúa en nombre del equipo" $?
grep -q 'forceNew=1' "$work/log"
check "fuerza un despliegue nuevo para que una reversión al mismo commit también se construya" $?
! grep -q 'tok_secreto_no_imprimir' "$work/out"
check "no imprime el token" $?

run error
[ "$code" -ne 0 ]
check "un despliegue en ERROR falla" $?

run canceled
[ "$code" -ne 0 ]
check "un despliegue cancelado falla" $?

run noalias
[ "$code" -ne 0 ]
check "READY sin alias asignado no cuenta como en línea" $?

run slow
[ "$code" -ne 0 ]
check "un despliegue que no termina a tiempo falla" $?

run ok COMMIT_SHA=abc
[ "$code" -ne 0 ] && ! grep -q "/v13/deployments" "$work/log"
check "un commit que no es completo se rechaza sin llamar a la API" $?

run ok VERCEL_TOKEN=
[ "$code" -ne 0 ]
check "sin token falla antes de llamar a la API" $?

if [ "$failures" -ne 0 ]; then echo "$failures prueba(s) fallaron"; exit 1; fi
echo "todas las pruebas pasaron"
