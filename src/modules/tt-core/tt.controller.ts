import { Body, Controller, Get, Ip, Logger, Post, UseFilters, UseGuards } from '@nestjs/common';

import { errorHandler } from '@common/helpers/error-handler.helper';
import { HttpExceptionFilter } from '@common/exception';
import { JwtDefaultGuard } from '@common/guards/jwt-guards';
import { XRAY_CONTROLLER, XRAY_ROUTES } from '@libs/contracts/api';

import {
    GetNodeHealthCheckResponseDto,
    GetXrayStatusAndVersionResponseDto,
    StartXrayRequestDto,
    StartXrayResponseDto,
    StopXrayResponseDto,
} from './dtos';
import { TtService } from './tt.service';

/**
 * Controller that exposes the same routes as the original Xray controller.
 * The panel communicates with these endpoints — we keep the contract identical.
 */
@UseFilters(HttpExceptionFilter)
@UseGuards(JwtDefaultGuard)
@Controller(XRAY_CONTROLLER)
export class TtController {
    private readonly logger = new Logger(TtController.name);

    constructor(private readonly ttService: TtService) {}

    @Post(XRAY_ROUTES.START)
    public async startTt(
        @Body() body: StartXrayRequestDto,
        @Ip() ip: string,
    ): Promise<StartXrayResponseDto> {
        const response = await this.ttService.startTt(body, ip);
        const data = errorHandler(response);
        return {
            response: data,
        };
    }

    @Get(XRAY_ROUTES.STOP)
    public async stopTt(): Promise<StopXrayResponseDto> {
        this.logger.log('Panel requested to stop TrustTunnel.');
        const response = await this.ttService.stopTt();
        const data = errorHandler(response);
        return {
            response: data,
        };
    }

    @Get(XRAY_ROUTES.STATUS)
    public async getStatusAndVersion(): Promise<GetXrayStatusAndVersionResponseDto> {
        const response = await this.ttService.getStatusAndVersion();
        const data = errorHandler(response);
        return {
            response: data,
        };
    }

    @Get(XRAY_ROUTES.NODE_HEALTH_CHECK)
    public async getNodeHealthCheck(): Promise<GetNodeHealthCheckResponseDto> {
        const response = await this.ttService.getNodeHealthCheck();
        const data = errorHandler(response);
        return {
            response: data,
        };
    }
}
