import { Logger, Module, OnApplicationShutdown } from '@nestjs/common';

import { HandlerModule } from './handler/handler.module';
import { TtModule } from './tt-core/tt.module';
import { StatsModule } from './stats/stats.module';
import { VisionModule } from './vision/vision.module';
@Module({
    imports: [StatsModule, TtModule, HandlerModule, VisionModule],
    providers: [],
})
export class YegherNodeModules implements OnApplicationShutdown {
    private readonly logger = new Logger(YegherNodeModules.name);

    async onApplicationShutdown(signal?: string): Promise<void> {
        this.logger.log(`${signal} received, shutting down...`);
    }
}
