# Yegher Node

**Yegher Node** is a VPN node agent that manages the [TrustTunnel](https://github.com/TrustTunnel/TrustTunnel) protocol via the [TT Wrapper](https://github.com/grandvan709/yegher-tt-wrapper) REST API. It serves as the node component of the Yegher VPN platform, providing full API compatibility with the Yegher control panel.

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

## Key Features

| Feature | Description |
|---------|-------------|
| VPN engine | TrustTunnel (via TT Wrapper REST API) |
| Protocol | TrustTunnel protocol by AdGuard |
| Process management | TT Wrapper (direct process control) |
| User model | Single user type (username + password) |
| Stats | Aggregated metrics via Prometheus |

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

Yegher Node exposes a REST API that the Yegher Panel uses to manage TrustTunnel nodes, users, and collect statistics.

## License

AGPL-3.0-only
