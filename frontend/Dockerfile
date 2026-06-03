# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Prevent CRA from baking the literal string "undefined" into the bundle
ARG REACT_APP_BACKEND_URL=
ARG GIT_SHA=dev
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN printf '%s\n' "$GIT_SHA" > public/build-id.txt
RUN yarn build

# Production stage
FROM nginx:1.27-alpine

RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY snippets/api-proxy.conf /etc/nginx/snippets/api-proxy.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
