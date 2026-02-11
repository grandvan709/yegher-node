import ems from 'enhanced-ms';

import { Injectable, Logger } from '@nestjs/common';

import { TtWrapperClient } from '@common/tt-wrapper';
import { ICommandResponse } from '@common/types/command-response.type';
import { ERRORS } from '@libs/contracts/constants/errors';

import {
    GetInboundUsersCountResponseModel,
    GetInboundUsersResponseModel,
    AddUserResponseModel,
    RemoveUserResponseModel,
} from './models';
import {
    AddUserRequestDto,
    AddUsersRequestDto,
    RemoveUserRequestDto,
    RemoveUsersRequestDto,
} from './dtos';
import { InternalService } from '../internal/internal.service';

/**
 * Handler service adapted for TrustTunnel.
 *
 * TrustTunnel has a simpler user model: just username + password.
 * There are no inbound tags, no protocol variants (vless/trojan/ss).
 * We extract the relevant data from the Xray-style requests the panel sends
 * and translate them into TT Wrapper API calls.
 */
@Injectable()
export class HandlerService {
    private readonly logger = new Logger(HandlerService.name);

    constructor(
        private readonly ttClient: TtWrapperClient,
        private readonly internalService: InternalService,
    ) {}

    public async addUser(data: AddUserRequestDto): Promise<ICommandResponse<AddUserResponseModel>> {
        try {
            const { data: requestData, hashData } = data;

            // Extract username and password from the first item
            // TrustTunnel uses a single user entry (no per-inbound distinction)
            const firstItem = requestData[0];
            if (!firstItem) {
                return {
                    isOk: true,
                    response: new AddUserResponseModel(false, 'No user data provided'),
                };
            }

            const username = firstItem.username;
            // Use vlessUuid as password for TrustTunnel (unique per user)
            const password = hashData.vlessUuid;

            this.logger.debug(`Adding user: ${username} to TrustTunnel`);

            // Remove user first (idempotent)
            await this.ttClient.removeUser(username);

            // Add user
            const result = await this.ttClient.addUser(username, password);

            if (!result.success) {
                this.logger.error(`Error adding user: ${result.message}`);
                return {
                    isOk: true,
                    response: new AddUserResponseModel(false, result.message || null),
                };
            }

            // Track user in internal service
            this.internalService.addUser(username, hashData.vlessUuid);

            return {
                isOk: true,
                response: new AddUserResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new AddUserResponseModel(false, message),
            };
        }
    }

    public async removeUser(
        data: RemoveUserRequestDto,
    ): Promise<ICommandResponse<RemoveUserResponseModel>> {
        try {
            const { username } = data;

            this.logger.debug(`Removing user: ${username} from TrustTunnel`);

            const result = await this.ttClient.removeUser(username);

            // Track removal
            this.internalService.removeUser(username);

            if (!result.success) {
                // User might not exist — that's OK
                this.logger.warn(`Remove user ${username}: ${result.message}`);
            }

            return {
                isOk: true,
                response: new RemoveUserResponseModel(true, null),
            };
        } catch (error: unknown) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new RemoveUserResponseModel(false, message),
            };
        }
    }

    public async addUsers(
        data: AddUsersRequestDto,
    ): Promise<ICommandResponse<AddUserResponseModel>> {
        const tm = performance.now();
        try {
            const { users } = data;

            this.logger.log(`Adding ${users.length} users to TrustTunnel`);

            // Prepare batch: extract username and password for each user
            const ttUsers = users.map((user) => ({
                username: user.userData.userId,
                password: user.userData.vlessUuid,
            }));

            // Remove existing users first
            const usernamesToRemove = ttUsers.map((u) => u.username);
            if (usernamesToRemove.length > 0) {
                await this.ttClient.removeUsersBatch(usernamesToRemove);
            }

            // Add batch
            const result = await this.ttClient.addUsersBatch(ttUsers);

            if (!result.success) {
                this.logger.error(`Batch add failed: ${result.message}`);
                return {
                    isOk: true,
                    response: new AddUserResponseModel(false, result.message || null),
                };
            }

            // Track all users
            for (const user of users) {
                this.internalService.addUser(user.userData.userId, user.userData.vlessUuid);
            }

            return {
                isOk: true,
                response: new AddUserResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new AddUserResponseModel(false, message),
            };
        } finally {
            const result = ems(performance.now() - tm, {
                extends: 'short',
                includeMs: true,
            });
            this.logger.log(`Batch add users completed in ${result ? result : '0ms'}`);
        }
    }

    public async removeUsers(
        data: RemoveUsersRequestDto,
    ): Promise<ICommandResponse<RemoveUserResponseModel>> {
        const tm = performance.now();
        try {
            const { users } = data;

            this.logger.log(`Removing ${users.length} users from TrustTunnel`);

            const usernames = users.map((u) => u.userId);

            if (usernames.length > 0) {
                await this.ttClient.removeUsersBatch(usernames);
            }

            // Track removals
            for (const username of usernames) {
                this.internalService.removeUser(username);
            }

            return {
                isOk: true,
                response: new RemoveUserResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new RemoveUserResponseModel(false, message),
            };
        } finally {
            const result = ems(performance.now() - tm, {
                extends: 'short',
                includeMs: true,
            });
            this.logger.log(`Batch remove users completed in ${result ? result : '0ms'}`);
        }
    }

    public async getInboundUsersCount(
        _tag: string,
    ): Promise<ICommandResponse<GetInboundUsersCountResponseModel>> {
        try {
            // TrustTunnel has no inbound tags — return total user count
            const count = this.internalService.getUserCount();
            return {
                isOk: true,
                response: new GetInboundUsersCountResponseModel(count),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: true,
                response: new GetInboundUsersCountResponseModel(0),
            };
        }
    }

    public async getInboundUsers(
        _tag: string,
    ): Promise<ICommandResponse<GetInboundUsersResponseModel>> {
        try {
            // Return all users from TT Wrapper
            const result = await this.ttClient.listUsers();

            const users =
                result.success && result.data
                    ? result.data.map((u) => ({ username: u.username }))
                    : [];

            return {
                isOk: true,
                response: new GetInboundUsersResponseModel(users),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: true,
                response: new GetInboundUsersResponseModel([]),
            };
        }
    }
}
