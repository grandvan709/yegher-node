import { Logger, Module, OnModuleDestroy } from '@nestjs/common';

import { InternalModule } from '../internal/internal.module';
import { TtController } from './tt.controller';
import { TtService } from './tt.service';

@Module({
    imports: [InternalModule],
    providers: [TtService],
    controllers: [TtController],
    exports: [TtService],
})
export class TtModule implements OnModuleDestroy {
    private readonly logger = new Logger(TtModule.name);

    constructor(private readonly ttService: TtService) {}

    async onModuleDestroy() {
        this.logger.log('Destroying module.');
        await this.ttService.killTtProcess();
    }
}
