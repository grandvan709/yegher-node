import { Injectable, Logger } from '@nestjs/common';

import { ICommandResponse } from '@common/types/command-response.type';

import { BlockIpResponseModel, UnblockIpResponseModel } from './models';
import { BlockIpRequestDto, UnblockIpRequestDto } from './dtos';

/**
 * Vision service adapted for TrustTunnel.
 *
 * TrustTunnel does not support dynamic IP blocking/unblocking via API.
 * These methods return success stubs to maintain API compatibility
 * with the panel. IP-level blocking can be handled at the firewall level.
 */
@Injectable()
export class VisionService {
    private readonly logger = new Logger(VisionService.name);

    constructor() {}

    public async blockIp(dto: BlockIpRequestDto): Promise<ICommandResponse<BlockIpResponseModel>> {
        try {
            const { ip } = dto;
            this.logger.warn(
                `IP blocking not supported by TrustTunnel. Ignoring block request for: ${ip}`,
            );

            return {
                isOk: true,
                response: new BlockIpResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                response: new BlockIpResponseModel(false, message),
            };
        }
    }

    public async unblockIp(
        dto: UnblockIpRequestDto,
    ): Promise<ICommandResponse<UnblockIpResponseModel>> {
        try {
            const { ip } = dto;
            this.logger.warn(
                `IP unblocking not supported by TrustTunnel. Ignoring unblock request for: ${ip}`,
            );

            return {
                isOk: true,
                response: new UnblockIpResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                response: new UnblockIpResponseModel(false, message),
            };
        }
    }
}
