import axios, { AxiosInstance, AxiosError } from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * HTTP client for communicating with the Yegher TT Wrapper REST API.
 * HTTP client for TT Wrapper API.
 */
@Injectable()
export class TtWrapperClient implements OnModuleInit {
    private readonly logger = new Logger(TtWrapperClient.name);
    private client: AxiosInstance;
    private readonly baseUrl: string;
    private readonly secretKey: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.getOrThrow<string>('TT_WRAPPER_URL');
        this.secretKey = this.configService.getOrThrow<string>('TT_WRAPPER_SECRET');

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30_000,
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    async onModuleInit() {
        try {
            const health = await this.healthCheck();
            this.logger.log(`TT Wrapper connected: ${this.baseUrl}, health: ${health}`);
        } catch (error) {
            this.logger.warn(`TT Wrapper not reachable at ${this.baseUrl}: ${error}`);
        }
    }

    // ── Health ──────────────────────────────────────────────────────

    async healthCheck(): Promise<boolean> {
        try {
            const { data } = await this.client.get('/api/health');
            return data?.success === true;
        } catch {
            return false;
        }
    }

    // ── Process control ────────────────────────────────────────────

    async start(): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.post('/api/start');
            return data;
        } catch (error) {
            return this.handleError(error, 'start');
        }
    }

    async stop(): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.post('/api/stop');
            return data;
        } catch (error) {
            return this.handleError(error, 'stop');
        }
    }

    async restart(): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.post('/api/restart');
            return data;
        } catch (error) {
            return this.handleError(error, 'restart');
        }
    }

    async getStatus(): Promise<{
        success: boolean;
        data?: { running: boolean; pid?: number; uptime_secs?: number };
    }> {
        try {
            const { data } = await this.client.get('/api/status');
            return data;
        } catch (error) {
            return this.handleError(error, 'getStatus');
        }
    }

    // ── Users ──────────────────────────────────────────────────────

    async addUser(
        username: string,
        password: string,
    ): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.post('/api/users', { username, password });
            return data;
        } catch (error) {
            return this.handleError(error, 'addUser');
        }
    }

    async removeUser(username: string): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.delete(`/api/users/${encodeURIComponent(username)}`);
            return data;
        } catch (error) {
            return this.handleError(error, 'removeUser');
        }
    }

    async addUsersBatch(
        users: Array<{ username: string; password: string }>,
    ): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.post('/api/users/batch', { users });
            return data;
        } catch (error) {
            return this.handleError(error, 'addUsersBatch');
        }
    }

    async removeUsersBatch(usernames: string[]): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.delete('/api/users/batch', {
                data: { usernames },
            });
            return data;
        } catch (error) {
            return this.handleError(error, 'removeUsersBatch');
        }
    }

    async listUsers(): Promise<{
        success: boolean;
        data?: Array<{ username: string }>;
    }> {
        try {
            const { data } = await this.client.get('/api/users');
            return data;
        } catch (error) {
            return this.handleError(error, 'listUsers');
        }
    }

    // ── Configuration ──────────────────────────────────────────────

    async uploadConfig(config: {
        vpn_toml: string;
        hosts_toml: string;
        credentials_toml?: string;
    }): Promise<{ success: boolean; message?: string }> {
        try {
            const { data } = await this.client.post('/api/config', config);
            return data;
        } catch (error) {
            return this.handleError(error, 'uploadConfig');
        }
    }

    // ── Metrics ────────────────────────────────────────────────────

    async getMetrics(): Promise<string | null> {
        try {
            const { data } = await this.client.get('/api/metrics', {
                headers: { Accept: 'text/plain' },
                responseType: 'text',
            });
            return typeof data === 'string' ? data : null;
        } catch {
            return null;
        }
    }

    // ── Client config ──────────────────────────────────────────────

    async getClientConfig(
        username: string,
        address: string,
    ): Promise<string | null> {
        try {
            const { data } = await this.client.get(
                `/api/client-config/${encodeURIComponent(username)}`,
                { params: { address }, responseType: 'text' },
            );
            return typeof data === 'string' ? data : null;
        } catch {
            return null;
        }
    }

    // ── Error handling ─────────────────────────────────────────────

    private handleError(error: unknown, operation: string): { success: false; message: string } {
        if (error instanceof AxiosError) {
            const msg = error.response?.data?.message || error.message;
            this.logger.error(`TT Wrapper ${operation} failed: ${msg}`);
            return { success: false, message: msg };
        }
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`TT Wrapper ${operation} failed: ${msg}`);
        return { success: false, message: msg };
    }
}
