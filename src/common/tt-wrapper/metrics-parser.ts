/**
 * Simple parser for Prometheus text format metrics from TrustTunnel.
 *
 * TrustTunnel exposes:
 * - client_sessions{protocol_type="http1|http2|http3"} (gauge)
 * - inbound_traffic_bytes{protocol_type="..."} (counter)
 * - outbound_traffic_bytes{protocol_type="..."} (counter)
 * - outbound_tcp_sockets (gauge)
 * - outbound_udp_sockets (gauge)
 */

export interface TtMetrics {
    clientSessions: number;
    inboundTrafficBytes: number;
    outboundTrafficBytes: number;
    outboundTcpSockets: number;
    outboundUdpSockets: number;
}

export function parsePrometheusMetrics(raw: string): TtMetrics {
    const result: TtMetrics = {
        clientSessions: 0,
        inboundTrafficBytes: 0,
        outboundTrafficBytes: 0,
        outboundTcpSockets: 0,
        outboundUdpSockets: 0,
    };

    const lines = raw.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Parse: metric_name{labels} value
        // or:   metric_name value
        const match = trimmed.match(/^(\w+)(?:\{[^}]*\})?\s+([\d.eE+-]+)$/);
        if (!match) continue;

        const [, name, valueStr] = match;
        const value = parseFloat(valueStr);
        if (isNaN(value)) continue;

        switch (name) {
            case 'client_sessions':
                result.clientSessions += value;
                break;
            case 'inbound_traffic_bytes':
                result.inboundTrafficBytes += value;
                break;
            case 'outbound_traffic_bytes':
                result.outboundTrafficBytes += value;
                break;
            case 'outbound_tcp_sockets':
                result.outboundTcpSockets += value;
                break;
            case 'outbound_udp_sockets':
                result.outboundUdpSockets += value;
                break;
        }
    }

    return result;
}
