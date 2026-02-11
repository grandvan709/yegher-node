import { readPackageJSON } from 'pkg-types';
import { table } from 'table';
import ems from 'enhanced-ms';
import pRetry from 'p-retry';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TtWrapperClient } from '@common/tt-wrapper';
import { ISystemStats } from '@common/utils/get-system-stats/get-system-stats.interface';
import { ICommandResponse } from '@common/types/command-response.type';
import { getSystemStats } from '@common/utils/get-system-stats';
import { StartXrayCommand } from '@libs/contracts/commands';

import {
    GetNodeHealthCheckResponseModel,
    GetXrayStatusAndVersionResponseModel,
    StartXrayResponseModel,
    StopXrayResponseModel,
} from './models';
import { InternalService } from '../internal/internal.service';

const TT_VERSION_LABEL = 'TrustTunnel' as const;

@Injectable()
export class TtService implements OnApplicationBootstrap {
    private readonly logger = new Logger(TtService.name);

    private ttVersion: string | null = TT_VERSION_LABEL;
    private isTtOnline: boolean = false;
    private systemStats: ISystemStats | null = null;
    private isStartProcessing: boolean = false;
    private nodeVersion: string = '0.0.0';

    constructor(
        private readonly ttClient: TtWrapperClient,
        private readonly internalService: InternalService,
        private readonly configService: ConfigService,
    ) {}

    async onApplicationBootstrap() {
        try {
            const pkg = await readPackageJSON();
            this.systemStats = await getSystemStats();
            this.nodeVersion = pkg.version ?? '0.0.0';
            this.ttVersion = TT_VERSION_LABEL;
        } catch (error) {
            this.logger.error(`Error in Application Bootstrap: ${error}`);
        }

        this.isTtOnline = false;
    }

    /**
     * Start TrustTunnel via TT Wrapper.
     *
     * The panel sends `StartXrayCommand.Request` with `xrayConfig` and `internals`.
     * We extract users from the Xray config, push them to TT Wrapper, and start TT.
     *
     * The response shape is identical to what the panel expects from Remnawave Node.
     */
    public async startTt(
        body: StartXrayCommand.Request,
        ip: string,
    ): Promise<ICommandResponse<StartXrayResponseModel>> {
        const tm = performance.now();

        try {
            if (this.isStartProcessing) {
                this.logger.warn('Request already in progress');
                return {
                    isOk: true,
                    response: new StartXrayResponseModel(
                        false,
                        this.ttVersion,
                        'Request already in progress',
                        null,
                        { version: this.nodeVersion },
                    ),
                };
            }

            this.isStartProcessing = true;

            // Check if TT is already running and config hasn't changed
            if (this.isTtOnline && !body.internals.forceRestart) {
                const status = await this.ttClient.getStatus();

                let shouldRestart = false;

                if (status.success && status.data?.running) {
                    shouldRestart = this.internalService.isNeedRestart(body.internals.hashes);
                } else {
                    this.isTtOnline = false;
                    shouldRestart = true;
                    this.logger.warn('TrustTunnel health check failed, restarting...');
                }

                if (!shouldRestart) {
                    return {
                        isOk: true,
                        response: new StartXrayResponseModel(
                            true,
                            this.ttVersion,
                            null,
                            this.systemStats,
                            { version: this.nodeVersion },
                        ),
                    };
                }
            }

            if (body.internals.forceRestart) {
                this.logger.warn('Force restart requested');
            }

            // Extract users from the Xray config that the panel sends
            const users = this.internalService.extractUsersFromXrayConfig(
                body.internals.hashes,
                body.xrayConfig,
            );

            this.logger.log(`Extracted ${users.length} users from panel config`);

            // Sync users to TT Wrapper: remove all, then add batch
            await this.syncUsersToTtWrapper(users);

            // Restart TrustTunnel process
            const restartResult = await this.ttClient.restart();

            if (!restartResult.success) {
                this.logger.error(`Failed to restart TrustTunnel: ${restartResult.message}`);
                return {
                    isOk: true,
                    response: new StartXrayResponseModel(
                        false,
                        this.ttVersion,
                        restartResult.message || 'Failed to restart TrustTunnel',
                        null,
                        { version: this.nodeVersion },
                    ),
                };
            }

            // Verify TT is actually running
            const isStarted = await this.verifyTtRunning();

            if (!isStarted) {
                this.isTtOnline = false;

                this.logger.error(
                    '\n' +
                        table(
                            [
                                ['Version', this.ttVersion],
                                ['Master IP', ip],
                                ['Internal Status', isStarted],
                            ],
                            {
                                header: {
                                    content: 'TrustTunnel failed to start',
                                    alignment: 'center',
                                },
                            },
                        ),
                );

                return {
                    isOk: true,
                    response: new StartXrayResponseModel(
                        false,
                        this.ttVersion,
                        'TrustTunnel process not running after restart',
                        this.systemStats,
                        { version: this.nodeVersion },
                    ),
                };
            }

            this.isTtOnline = true;

            this.logger.log(
                '\n' +
                    table(
                        [
                            ['Version', this.ttVersion],
                            ['Master IP', ip],
                            ['Users synced', users.length],
                        ],
                        {
                            header: {
                                content: 'TrustTunnel started',
                                alignment: 'center',
                            },
                        },
                    ),
            );

            return {
                isOk: true,
                response: new StartXrayResponseModel(
                    true,
                    this.ttVersion,
                    null,
                    this.systemStats,
                    { version: this.nodeVersion },
                ),
            };
        } catch (error) {
            let errorMessage = null;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            this.logger.error(`Failed to start TrustTunnel: ${errorMessage}`);

            return {
                isOk: true,
                response: new StartXrayResponseModel(false, null, errorMessage, null, {
                    version: this.nodeVersion,
                }),
            };
        } finally {
            this.logger.log(
                'Attempt to start TrustTunnel took: ' +
                    ems(performance.now() - tm, {
                        extends: 'short',
                        includeMs: true,
                    }),
            );
            this.isStartProcessing = false;
        }
    }

    public async stopTt(): Promise<ICommandResponse<StopXrayResponseModel>> {
        try {
            await this.ttClient.stop();
            this.isTtOnline = false;
            this.internalService.cleanup();

            return {
                isOk: true,
                response: new StopXrayResponseModel(true),
            };
        } catch (error) {
            this.logger.error(`Failed to stop TrustTunnel: ${error}`);
            return {
                isOk: true,
                response: new StopXrayResponseModel(false),
            };
        }
    }

    public async getStatusAndVersion(): Promise<
        ICommandResponse<GetXrayStatusAndVersionResponseModel>
    > {
        try {
            const status = await this.ttClient.getStatus();
            const isRunning = status.success && status.data?.running === true;

            return {
                isOk: true,
                response: new GetXrayStatusAndVersionResponseModel(isRunning, this.ttVersion),
            };
        } catch (error) {
            this.logger.error(`Failed to get TT status: ${error}`);
            return {
                isOk: true,
                response: new GetXrayStatusAndVersionResponseModel(false, null),
            };
        }
    }

    public async getNodeHealthCheck(): Promise<ICommandResponse<GetNodeHealthCheckResponseModel>> {
        try {
            return {
                isOk: true,
                response: new GetNodeHealthCheckResponseModel(
                    true,
                    this.isTtOnline,
                    this.ttVersion,
                    this.nodeVersion,
                ),
            };
        } catch (error) {
            this.logger.error(`Failed to get node health check: ${error}`);
            return {
                isOk: true,
                response: new GetNodeHealthCheckResponseModel(false, false, null, this.nodeVersion),
            };
        }
    }

    public async killTtProcess(): Promise<void> {
        try {
            await this.ttClient.stop();
            this.logger.log('TrustTunnel process stopped.');
        } catch (error) {
            this.logger.log(`No existing TrustTunnel process found. Error: ${error}`);
        }
    }

    public getTtInfo(): {
        version: string | null;
        systemInfo: ISystemStats | null;
    } {
        return {
            version: this.ttVersion,
            systemInfo: this.systemStats,
        };
    }

    // ── Private helpers ────────────────────────────────────────────

    private async syncUsersToTtWrapper(
        users: Array<{ username: string; password: string }>,
    ): Promise<void> {
        // Get current users from TT Wrapper
        const currentUsersResult = await this.ttClient.listUsers();
        const currentUsernames =
            currentUsersResult.success && currentUsersResult.data
                ? currentUsersResult.data.map((u) => u.username)
                : [];

        // Remove all existing users
        if (currentUsernames.length > 0) {
            await this.ttClient.removeUsersBatch(currentUsernames);
        }

        // Add all users from panel config
        if (users.length > 0) {
            await this.ttClient.addUsersBatch(users);
        }
    }

    private async verifyTtRunning(): Promise<boolean> {
        try {
            return await pRetry(
                async () => {
                    const status = await this.ttClient.getStatus();
                    if (!status.success || !status.data?.running) {
                        throw new Error('TrustTunnel not running');
                    }
                    return true;
                },
                {
                    retries: 10,
                    minTimeout: 2000,
                    maxTimeout: 2000,
                    onFailedAttempt: (error) => {
                        this.logger.debug(
                            `TT status check attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
                        );
                    },
                },
            );
        } catch (error) {
            this.logger.error(`Failed to verify TrustTunnel status: ${error}`);
            return false;
        }
    }
}
