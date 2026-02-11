import { Body, Controller, Get, Ip, Logger, Post, UseFilters, UseGuards } from '@nestjs/common';

import { errorHandler } from '@common/helpers/error-handler.helper';
import { HttpExceptionFilter } from '@common/exception';
import { JwtDefaultGuard } from '@common/guards/jwt-guards';
import { TT_CONTROLLER, TT_ROUTES } from '@libs/contracts/api';

import {
    GetNodeHealthCheckResponseDto,
    GetTtStatusAndVersionResponseDto,
    StartTtRequestDto,
    StartTtResponseDto,
    StopTtResponseDto,
} from './dtos';
import { TtService } from './tt.service';

/**
 * Controller that exposes the TrustTunnel management routes.
 * The panel communicates with these endpoints.
 */
@UseFilters(HttpExceptionFilter)
@UseGuards(JwtDefaultGuard)
@Controller(TT_CONTROLLER)
export class TtController {
    private readonly logger = new Logger(TtController.name);

    constructor(private readonly ttService: TtService) {}

    @Post(TT_ROUTES.START)
    public async startTt(
        @Body() body: StartTtRequestDto,
        @Ip() ip: string,
    ): Promise<StartTtResponseDto> {
        const response = await this.ttService.startTt(body, ip);
        const data = errorHandler(response);
        return {
            response: data,
        };
    }

    @Get(TT_ROUTES.STOP)
    public async stopTt(): Promise<StopTtResponseDto> {
        this.logger.log('Panel requested to stop TrustTunnel.');
        const response = await this.ttService.stopTt();
        const data = errorHandler(response);
        return {
            response: data,
        };
    }

    @Get(TT_ROUTES.STATUS)
    public async getStatusAndVersion(): Promise<GetTtStatusAndVersionResponseDto> {
        const response = await this.ttService.getStatusAndVersion();
        const data = errorHandler(response);
        return {
            response: data,
        };
    }

    @Get(TT_ROUTES.NODE_HEALTH_CHECK)
    public async getNodeHealthCheck(): Promise<GetNodeHealthCheckResponseDto> {
        const response = await this.ttService.getNodeHealthCheck();
        const data = errorHandler(response);
        return {
            response: data,
        };
    }
}
