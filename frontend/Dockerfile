# The studio: a static bundle served by nginx, which also proxies /api to the API.
# Build happens in the image, so a client needs Docker only — not Node, Yarn or Python.

FROM node:20-slim AS build

WORKDIR /app

# Dependency layer first: it only rebuilds when the lockfile changes.
COPY package.json yarn.lock ./

# @emergentbase/overlay and @emergentbase/visual-edits are dev-server editor tooling
# (a branded error overlay and a visual-edit bridge) fetched from a vendor CDN. A
# production build never uses them, and because they are URL dependencies yarn cannot
# fail softly on them — declared optional, or installed with --ignore-optional, it still
# exits non-zero when the CDN is unreachable (both measured). So they are dropped here
# instead of relied upon; craco.config.js already degrades gracefully without them.
# The install is therefore not --frozen-lockfile: the lockfile still pins every remaining
# dependency exactly, but package.json no longer matches it.
RUN corepack enable \
 && node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));for (const name of ['@emergentbase/overlay','@emergentbase/visual-edits']) delete p.devDependencies[name];fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');" \
 && yarn install --network-timeout 600000

COPY . .

# Branding and the shipped catalogue are baked in so the studio is branded on the very
# first paint (no flash). The API serves the same values at runtime too, which is how
# one image can serve several clients — see DEPLOY.md.
# REACT_APP_BACKEND_URL is deliberately empty: the browser calls same-origin /api.
ARG REACT_APP_BACKEND_URL=""
ARG REACT_APP_BRAND_NAME=""
ARG REACT_APP_BRAND_SUBTITLE=""
ARG REACT_APP_BRAND_ACCENT=""
ARG REACT_APP_BRAND_LOGO_URL=""
ARG REACT_APP_DEFAULT_CATALOG=""
# Escape hatch for a build host with too little RAM for the separate type-checker
# worker; see the troubleshooting note in DEPLOY.md.
ARG DISABLE_TS_CHECKER=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL \
    REACT_APP_BRAND_NAME=$REACT_APP_BRAND_NAME \
    REACT_APP_BRAND_SUBTITLE=$REACT_APP_BRAND_SUBTITLE \
    REACT_APP_BRAND_ACCENT=$REACT_APP_BRAND_ACCENT \
    REACT_APP_BRAND_LOGO_URL=$REACT_APP_BRAND_LOGO_URL \
    REACT_APP_DEFAULT_CATALOG=$REACT_APP_DEFAULT_CATALOG \
    GENERATE_SOURCEMAP=false \
    DISABLE_TS_CHECKER=$DISABLE_TS_CHECKER

RUN yarn build


FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1
