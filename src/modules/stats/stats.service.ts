import { Injectable, Logger } from '@nestjs/common';

import { TtWrapperClient } from '@common/tt-wrapper';
import { parsePrometheusMetrics, TtMetrics } from '@common/tt-wrapper/metrics-parser';
import { ICommandResponse } from '@common/types/command-response.type';
import { ERRORS } from '@libs/contracts/constants';

import {
    GetAllInboundsStatsResponseModel,
    GetAllOutboundsStatsResponseModel,
    GetCombinedStatsResponseModel,
    GetInboundStatsResponseModel,
    GetOutboundStatsResponseModel,
    GetSystemStatsResponseModel,
    GetUserOnlineStatusResponseModel,
    GetUsersStatsResponseModel,
} from './models';
import { IGetUserOnlineStatusRequest } from './interfaces';

/**
 * Stats service adapted for TrustTunnel.
 *
 * TrustTunnel exposes Prometheus metrics (inbound/outbound bytes, sessions).
 * It does NOT provide per-user traffic stats — only aggregated totals.
 * We map these to the response format the panel expects.
 *
 * Key differences:
 * - No per-user uplink/downlink (getUsersStats returns empty)
 * - No Go runtime stats (getSystemStats returns synthetic values)
 * - Inbound/outbound stats come from Prometheus counters
 * - User online status based on client_sessions > 0
 */
@Injectable()
export class StatsService {
    private readonly logger = new Logger(StatsService.name);

    // Track previous metric values for delta calculation (reset support)
    private previousMetrics: TtMetrics | null = null;
    private lastMetrics: TtMetrics | null = null;

    constructor(private readonly ttClient: TtWrapperClient) {}

    public async getUserOnlineStatus(
        body: IGetUserOnlineStatusRequest,
    ): Promise<ICommandResponse<GetUserOnlineStatusResponseModel>> {
        try {
            // TrustTunnel doesn't track per-user online status.
            // We can only tell if there are any active sessions.
            const metrics = await this.fetchMetrics();
            const isOnline = metrics ? metrics.clientSessions > 0 : false;

            return {
                isOk: true,
                response: new GetUserOnlineStatusResponseModel(isOnline),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: true,
                response: new GetUserOnlineStatusResponseModel(false),
            };
        }
    }

    public async getSystemStats(): Promise<ICommandResponse<GetSystemStatsResponseModel>> {
        try {
            const metrics = await this.fetchMetrics();

            if (!metrics) {
                return {
                    isOk: false,
                    ...ERRORS.FAILED_TO_GET_SYSTEM_STATS,
                };
            }

            // Map TrustTunnel metrics to system stats
            // These are synthetic values since TT doesn't expose Go runtime stats
            return {
                isOk: true,
                response: new GetSystemStatsResponseModel({
                    numGoroutine: metrics.outboundTcpSockets + metrics.outboundUdpSockets,
                    numGC: 0,
                    alloc: 0,
                    totalAlloc: metrics.inboundTrafficBytes + metrics.outboundTrafficBytes,
                    sys: 0,
                    mallocs: 0,
                    frees: 0,
                    liveObjects: metrics.clientSessions,
                    pauseTotalNs: 0,
                    uptime: 0,
                }),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_SYSTEM_STATS,
            };
        }
    }

    public async getUsersStats(
        reset: boolean,
    ): Promise<ICommandResponse<GetUsersStatsResponseModel>> {
        try {
            // TrustTunnel does NOT provide per-user traffic stats.
            // Return empty array — the panel will handle this gracefully.
            return {
                isOk: true,
                response: new GetUsersStatsResponseModel([]),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_USERS_STATS,
            };
        }
    }

    public async getInboundStats(
        tag: string,
        reset: boolean,
    ): Promise<ICommandResponse<GetInboundStatsResponseModel>> {
        try {
            const metrics = await this.getMetricsWithReset(reset);

            if (!metrics) {
                return {
                    isOk: false,
                    ...ERRORS.FAILED_TO_GET_INBOUND_STATS,
                };
            }

            return {
                isOk: true,
                response: new GetInboundStatsResponseModel({
                    inbound: tag || 'trusttunnel-inbound',
                    downlink: metrics.inboundTrafficBytes,
                    uplink: metrics.outboundTrafficBytes,
                }),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_INBOUND_STATS,
            };
        }
    }

    public async getOutboundStats(
        tag: string,
        reset: boolean,
    ): Promise<ICommandResponse<GetOutboundStatsResponseModel>> {
        try {
            const metrics = await this.getMetricsWithReset(reset);

            if (!metrics) {
                return {
                    isOk: false,
                    ...ERRORS.FAILED_TO_GET_OUTBOUND_STATS,
                };
            }

            return {
                isOk: true,
                response: new GetOutboundStatsResponseModel({
                    outbound: tag || 'trusttunnel-outbound',
                    downlink: metrics.outboundTrafficBytes,
                    uplink: metrics.inboundTrafficBytes,
                }),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_OUTBOUND_STATS,
            };
        }
    }

    public async getAllInboundsStats(
        reset: boolean,
    ): Promise<ICommandResponse<GetAllInboundsStatsResponseModel>> {
        try {
            const metrics = await this.getMetricsWithReset(reset);

            if (!metrics) {
                return {
                    isOk: false,
                    ...ERRORS.FAILED_TO_GET_INBOUNDS_STATS,
                };
            }

            // TrustTunnel has a single "inbound" — the TT endpoint
            return {
                isOk: true,
                response: new GetAllInboundsStatsResponseModel([
                    {
                        inbound: 'trusttunnel-inbound',
                        downlink: metrics.inboundTrafficBytes,
                        uplink: metrics.outboundTrafficBytes,
                    },
                ]),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_INBOUNDS_STATS,
            };
        }
    }

    public async getAllOutboundsStats(
        reset: boolean,
    ): Promise<ICommandResponse<GetAllOutboundsStatsResponseModel>> {
        try {
            const metrics = await this.getMetricsWithReset(reset);

            if (!metrics) {
                return {
                    isOk: false,
                    ...ERRORS.FAILED_TO_GET_OUTBOUNDS_STATS,
                };
            }

            return {
                isOk: true,
                response: new GetAllOutboundsStatsResponseModel([
                    {
                        outbound: 'trusttunnel-outbound',
                        downlink: metrics.outboundTrafficBytes,
                        uplink: metrics.inboundTrafficBytes,
                    },
                ]),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_OUTBOUNDS_STATS,
            };
        }
    }

    public async getCombinedStats(
        reset: boolean,
    ): Promise<ICommandResponse<GetCombinedStatsResponseModel>> {
        try {
            const metrics = await this.getMetricsWithReset(reset);

            if (!metrics) {
                return {
                    isOk: false,
                    ...ERRORS.FAILED_TO_GET_COMBINED_STATS,
                };
            }

            return {
                isOk: true,
                response: new GetCombinedStatsResponseModel(
                    [
                        {
                            inbound: 'trusttunnel-inbound',
                            downlink: metrics.inboundTrafficBytes,
                            uplink: metrics.outboundTrafficBytes,
                        },
                    ],
                    [
                        {
                            outbound: 'trusttunnel-outbound',
                            downlink: metrics.outboundTrafficBytes,
                            uplink: metrics.inboundTrafficBytes,
                        },
                    ],
                ),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                ...ERRORS.FAILED_TO_GET_COMBINED_STATS,
            };
        }
    }

    // ── Private helpers ────────────────────────────────────────────

    private async fetchMetrics(): Promise<TtMetrics | null> {
        const raw = await this.ttClient.getMetrics();
        if (!raw) return null;
        const metrics = parsePrometheusMetrics(raw);
        this.lastMetrics = metrics;
        return metrics;
    }

    private async getMetricsWithReset(reset: boolean): Promise<TtMetrics | null> {
        const current = await this.fetchMetrics();
        if (!current) return null;

        if (reset && this.previousMetrics) {
            // Return delta since last reset
            const delta: TtMetrics = {
                clientSessions: current.clientSessions,
                inboundTrafficBytes:
                    current.inboundTrafficBytes - this.previousMetrics.inboundTrafficBytes,
                outboundTrafficBytes:
                    current.outboundTrafficBytes - this.previousMetrics.outboundTrafficBytes,
                outboundTcpSockets: current.outboundTcpSockets,
                outboundUdpSockets: current.outboundUdpSockets,
            };
            this.previousMetrics = current;
            return delta;
        }

        if (reset) {
            this.previousMetrics = current;
        }

        return current;
    }
}
