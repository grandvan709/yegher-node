import { Controller, Get, UseFilters } from '@nestjs/common';

import { HttpExceptionFilter } from '@common/exception';
import { TT_INTERNAL_API_CONTROLLER, TT_INTERNAL_API_PATH } from '@libs/contracts/constants';

import { InternalService } from './internal.service';

@UseFilters(HttpExceptionFilter)
@Controller(TT_INTERNAL_API_CONTROLLER)
export class InternalController {
    constructor(private readonly internalService: InternalService) {}

    @Get(TT_INTERNAL_API_PATH)
    public async getConfig(): Promise<Record<string, unknown>> {
        try {
            return {
                engine: 'trusttunnel',
                users: this.internalService.getUserCount(),
            };
        } catch {
            return {};
        }
    }
}
