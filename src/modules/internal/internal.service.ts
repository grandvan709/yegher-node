import { getSemaphore } from '@henrygd/semaphore';
import ems from 'enhanced-ms';

import { Injectable, Logger } from '@nestjs/common';

import { StartTtCommand } from '@libs/contracts/commands';

/**
 * Internal service adapted for TrustTunnel.
 *
 * Instead of tracking inbound hash maps, we maintain a simple
 * user registry (username → hashUuid) and a config hash for change detection.
 *
 * The `extractUsersFromTtConfig` method parses the config
 * that the panel sends and extracts user credentials for TrustTunnel.
 */
@Injectable()
export class InternalService {
    private readonly logger = new Logger(InternalService.name);
    private readonly mutex = getSemaphore();

    // Simple user tracking: username → hashUuid
    private usersMap: Map<string, string> = new Map();

    // Config hash for change detection
    private configHash: string | null = null;
    private inboundHashes: Map<string, string> = new Map();

    constructor() {}

    /**
     * Extract users from the config that the panel sends.
     * The panel sends a config with inbounds containing clients.
     * We extract username + uuid/password for TrustTunnel.
     */
    public extractUsersFromTtConfig(
        hashes: StartTtCommand.Request['internals']['hashes'],
        ttConfig: Record<string, unknown>,
    ): Array<{ username: string; password: string }> {
        this.cleanup();

        const start = performance.now();
        const users: Array<{ username: string; password: string }> = [];

        this.configHash = hashes.emptyConfig;
        for (const inbound of hashes.inbounds) {
            this.inboundHashes.set(inbound.tag, inbound.hash);
        }

        if (ttConfig.inbounds && Array.isArray(ttConfig.inbounds)) {
            for (const inbound of ttConfig.inbounds) {
                if (
                    inbound.settings &&
                    inbound.settings.clients &&
                    Array.isArray(inbound.settings.clients)
                ) {
                    for (const client of inbound.settings.clients) {
                        // TrustTunnel clients have: username and password
                        const username = client.email || client.id || '';
                        const password = client.id || client.password || '';

                        if (username && password) {
                            // Avoid duplicates
                            if (!this.usersMap.has(username)) {
                                users.push({ username, password });
                                this.usersMap.set(username, password);
                            }
                        }
                    }
                }
            }
        }

        const result = ems(performance.now() - start, {
            extends: 'short',
            includeMs: true,
        });

        this.logger.log(
            `User extraction completed in ${result ? result : '0ms'}: ${users.length} users`,
        );

        return users;
    }

    /**
     * Check if TrustTunnel needs a restart based on config hash changes.
     * Mirrors the logic from the original node implementation.
     */
    public isNeedRestart(
        incomingHashes: StartTtCommand.Request['internals']['hashes'],
    ): boolean {
        const start = performance.now();
        try {
            if (!this.configHash) {
                return true;
            }

            if (incomingHashes.emptyConfig !== this.configHash) {
                this.logger.warn('Detected changes in base configuration');
                return true;
            }

            if (incomingHashes.inbounds.length !== this.inboundHashes.size) {
                this.logger.warn('Number of inbounds has changed');
                return true;
            }

            for (const incoming of incomingHashes.inbounds) {
                const currentHash = this.inboundHashes.get(incoming.tag);
                if (!currentHash || currentHash !== incoming.hash) {
                    this.logger.warn(`User configuration changed for inbound ${incoming.tag}`);
                    return true;
                }
            }

            this.logger.log('Configuration is up-to-date — no restart required');
            return false;
        } catch (error) {
            this.logger.error(`Failed to check if restart is needed: ${error}`);
            return true;
        } finally {
            const result = ems(performance.now() - start, {
                extends: 'short',
                includeMs: true,
            });
            this.logger.log(`Configuration hash check completed in ${result ? result : '0ms'}`);
        }
    }

    // ── User tracking ──────────────────────────────────────────────

    public addUser(username: string, hashUuid: string): void {
        this.usersMap.set(username, hashUuid);
    }

    public removeUser(username: string): void {
        this.usersMap.delete(username);
    }

    public getUserCount(): number {
        return this.usersMap.size;
    }

    public getUsers(): Map<string, string> {
        return this.usersMap;
    }

    // ── Cleanup ────────────────────────────────────────────────────

    public cleanup(): void {
        this.logger.log('Cleaning up internal service.');
        this.usersMap.clear();
        this.configHash = null;
        this.inboundHashes.clear();
    }
}
