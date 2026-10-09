#!/usr/bin/env bash
# Adaptador de Vercel (TAR-167): pide a Vercel construir y publicar un commit exacto del repositorio
# y espera a que quede en línea (READY y con el alias del proyecto asignado).
# Variables: VERCEL_TOKEN (secreto), VERCEL_PROJECT_ID, VERCEL_TEAM_ID, VERCEL_PROJECT_NAME,
# COMMIT_SHA; GITHUB_REPOSITORY y GITHUB_REF_NAME las pone GitHub Actions. El token nunca se imprime.
# El proyecto de Vercel de desarrollo tiene development como rama de producción, por eso el destino
# es "production": así el alias de desarrollo apunta al despliegue nuevo.
set -euo pipefail

: "${VERCEL_TOKEN:?falta VERCEL_TOKEN}"
: "${VERCEL_PROJECT_ID:?falta VERCEL_PROJECT_ID}"
: "${VERCEL_TEAM_ID:?falta VERCEL_TEAM_ID}"
: "${VERCEL_PROJECT_NAME:?falta VERCEL_PROJECT_NAME}"
: "${COMMIT_SHA:?falta COMMIT_SHA}"
: "${GITHUB_REPOSITORY:?falta GITHUB_REPOSITORY}"
: "${GITHUB_REF_NAME:?falta GITHUB_REF_NAME}"

if ! [[ "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "COMMIT_SHA debe ser un commit completo de 40 caracteres" >&2
  exit 2
fi

org="${GITHUB_REPOSITORY%%/*}"
repo="${GITHUB_REPOSITORY#*/}"
api="https://api.vercel.com/v13/deployments"
attempts="${VERCEL_ATTEMPTS:-60}"
pause="${VERCEL_PAUSE_SECONDS:-10}"

call() {
  curl -fsS --max-time 60 -H "Authorization: Bearer ${VERCEL_TOKEN}" -H 'Accept: application/json' "$@"
}

# forceNew: un commit que ya estuvo desplegado (una reversión) se construye de nuevo en vez de
# reutilizar la construcción anterior.
body="$(jq -cn \
  --arg name "$VERCEL_PROJECT_NAME" --arg project "$VERCEL_PROJECT_ID" \
  --arg org "$org" --arg repo "$repo" --arg ref "$GITHUB_REF_NAME" --arg sha "$COMMIT_SHA" \
  '{name: $name, project: $project, target: "production",
    gitSource: {type: "github", org: $org, repo: $repo, ref: $ref, sha: $sha}}')"

deploy_id="$(call -X POST -H 'Content-Type: application/json' -d "$body" \
  "${api}?teamId=${VERCEL_TEAM_ID}&forceNew=1&skipAutoDetectionConfirmation=1" | jq -er .id)"
echo "Vercel creó el despliegue ${deploy_id}"

for ((i = 1; i <= attempts; i++)); do
  state_json="$(call "${api}/${deploy_id}?teamId=${VERCEL_TEAM_ID}")"
  state="$(jq -er .readyState <<< "$state_json")"
  aliased="$(jq -r '.aliasAssigned // false' <<< "$state_json")"
  echo "Estado ${i}/${attempts}: ${state} (alias asignado: ${aliased})"
  case "$state" in
    READY)
      if [ "$aliased" = "true" ]; then exit 0; fi
      ;;
    ERROR | CANCELED | DELETED)
      echo "El despliegue ${deploy_id} terminó en ${state}" >&2
      exit 1
      ;;
  esac
  sleep "$pause"
done

echo "El despliegue ${deploy_id} no quedó en línea a tiempo" >&2
exit 1
