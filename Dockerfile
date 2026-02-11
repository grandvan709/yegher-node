# ─── Stage 1: Build NestJS application ───────────────────────────
FROM node:24.13-alpine AS build

WORKDIR /opt/app
ADD . .

RUN npm ci --legacy-peer-deps
RUN npm run build --omit=dev

# ─── Stage 2: Runtime ────────────────────────────────────────────
FROM node:24.13-alpine

WORKDIR /opt/app

# Copy NestJS application
COPY --from=build /opt/app/dist /opt/app/dist
COPY docker-entrypoint.sh /usr/local/bin/
COPY package*.json ./
COPY ./libs ./libs

# Create TrustTunnel config and log directories
RUN mkdir -p /etc/trusttunnel /var/log/trusttunnel && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Install production dependencies
RUN npm ci --omit=dev --legacy-peer-deps \
    && npm cache clean --force

# Log helpers
RUN echo '#!/bin/sh' > /usr/local/bin/ttlogs \
    && echo 'tail -n +1 -f /var/log/trusttunnel/tt.log' >> /usr/local/bin/ttlogs \
    && chmod +x /usr/local/bin/ttlogs

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-http-header-size=65536"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["node", "dist/src/main"]