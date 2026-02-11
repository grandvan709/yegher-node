# Yegher Node

**Yegher Node** is a VPN node agent that manages the [TrustTunnel](https://github.com/TrustTunnel/TrustTunnel) protocol via the [TT Wrapper](https://github.com/grandvan709/yegher-tt-wrapper) REST API. It is designed to be a drop-in replacement for [Remnawave Node](https://github.com/remnawave/node), maintaining full API compatibility with the Yegher control panel while using TrustTunnel instead of Xray-core.

## Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌───────────────┐
│  Yegher Panel   │◄──JWT──►│  Yegher Node │◄──HTTP──►│  TT Wrapper   │
│  (backend)      │  REST   │  (NestJS)    │  REST    │  (Rust/Axum)  │
└─────────────────┘         └──────────────┘         └───────┴───────┘
                                                             │ process
                                                     ┌──────▼───────┐
                                                     │ TrustTunnel  │
                                                     │ (VPN server) │
                                                     └──────────────┘
```

## Key Differences from Remnawave Node

| Aspect | Remnawave Node | Yegher Node |
|--------|---------------|-------------|
| VPN engine | Xray-core (gRPC API) | TrustTunnel (via TT Wrapper REST API) |
| Protocol support | VLESS, VMess, Trojan, Shadowsocks | TrustTunnel protocol |
| Process management | Supervisord | TT Wrapper (direct process control) |
| User model | Per-inbound, per-protocol | Single user type (username + password) |
| Stats | Per-user traffic via Xray gRPC | Aggregated metrics via Prometheus |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_PORT` | `2222` | Port for the node REST API |
| `SECRET_KEY` | — | Secret key from the Yegher Panel |
| `TT_WRAPPER_URL` | `http://127.0.0.1:61000` | URL of the TT Wrapper API |
| `TT_WRAPPER_SECRET` | `changeme` | Bearer token for TT Wrapper authentication |

## Deployment

### Docker Compose (recommended)

Create `.env` and `.env.tt-wrapper` files from the samples, then:

```bash
docker compose -f docker-compose-prod.yml up -d
```

This starts two containers:
1. **yegher-node** — the NestJS application (API for the panel)
2. **tt-wrapper** — the Rust API wrapper managing TrustTunnel

### Development

```bash
npm ci --legacy-peer-deps
cp .env.sample .env
# Edit .env with your settings
npm run start:dev
```

## API Compatibility

Yegher Node exposes the exact same REST API as Remnawave Node, so the control panel requires no modifications to communicate with it.

## License

AGPL-3.0-only
