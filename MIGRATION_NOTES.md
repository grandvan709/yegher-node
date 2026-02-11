# Yegher Node: Migration from Xray to TrustTunnel

## What changes

### 1. Remove Xray/XTLS dependencies
- Remove `@remnawave/xtls-sdk`, `@remnawave/xtls-sdk-nestjs`
- Remove `@remnawave/supervisord-nestjs`, `@kastov/node-supervisord`
- Remove `@remnawave/hashed-set`
- Remove `nice-grpc` (was used for gRPC to Xray)
- Add `axios` for HTTP calls to TT Wrapper

### 2. Replace `xray-core` module → `tt-core` module
- `xray.service.ts` → `tt.service.ts`: calls TT Wrapper REST API instead of supervisord+xtls-sdk
- `xray.controller.ts` → `tt.controller.ts`: same API contract to panel, different internals
- `xray.module.ts` → `tt.module.ts`
- DTOs/models remain structurally similar (panel expects same response shape)

### 3. Replace `handler.service.ts`
- Instead of `xtlsApi.handler.addVlessUser/addTrojanUser/addShadowsocksUser`
- Call TT Wrapper `POST /api/users` and `DELETE /api/users/:username`
- TrustTunnel has single user type (username+password), no protocol variants
- Simplify: no inbound tags, no protocol switch, just username+password

### 4. Replace `stats.service.ts`
- Instead of `xtlsSdk.stats.*`
- Call TT Wrapper `GET /api/metrics` (Prometheus format)
- Parse Prometheus text → extract inbound/outbound traffic bytes, sessions
- TrustTunnel metrics: `inbound_traffic_bytes`, `outbound_traffic_bytes`, `client_sessions`
- No per-user stats from TrustTunnel (limitation) — return aggregated only

### 5. Simplify `internal.service.ts`
- No more Xray config generation (generateApiConfig)
- No more inbound hash tracking
- Store TT config (vpn.toml, hosts.toml content) instead
- The internal controller that serves Xray config via unix socket → removed

### 6. Remove `vision` module
- IP blocking via Xray router rules → not applicable to TrustTunnel
- Remove entirely for now

### 7. Update `app.module.ts`
- Remove XtlsSdkNestjsModule, SupervisordNestjsModule
- Add TtWrapperModule (HttpModule with axios)
- Simplify config schema (no SUPERVISORD_*, no XTLS_API_PORT)
- Add TT_WRAPPER_URL, TT_WRAPPER_SECRET

### 8. Update `docker-entrypoint.sh`
- Remove supervisord startup
- Remove Xray version detection
- Simple: just start the NestJS app

### 9. Update Dockerfile
- Remove Xray download
- Remove supervisord installation
- Include yegher-tt-wrapper binary (or reference separate container)

### 10. Update .env.sample
- Remove XTLS_API_PORT
- Add TT_WRAPPER_URL=http://127.0.0.1:61000
- Add TT_WRAPPER_SECRET=changeme

## API contract preservation
The panel communicates with the node via REST API. We MUST keep the same
route structure and response shapes so the panel doesn't need changes yet.
The panel sends Xray JSON config in startXray — we'll extract what we need
and ignore the rest, or we'll change this in the panel phase.
