# Imagen del frontend: sirve el build de Angular con nginx sin privilegios. Es el artefacto portable
# y verificable por CI (job docker-build); el despliegue actual en Vercel no la usa. Bases fijadas
# por tag y digest: Dependabot (ecosistema docker) las mantiene al día.
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build
WORKDIR /build
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .
# URL base del BFF (QP-ANGWEB-BFF-01): vacío = valor local por defecto de scripts/set-env.mjs.
ARG NG_APP_BFF_BASE_URL=""
ENV NG_APP_BFF_BASE_URL=${NG_APP_BFF_BASE_URL}
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:ed04ec1ff34502c339ee5c3ae3f855442398edc1d05591e2b98981dcbbd20b1e
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/quipu-app-angweb/browser /usr/share/nginx/html
# Usuario sin privilegios declarado de forma explícita (uid 101, el de la imagen base).
USER nginx
EXPOSE 8080
