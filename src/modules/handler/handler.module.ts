import { Module } from '@nestjs/common';

import { InternalModule } from '../internal/internal.module';
import { HandlerController } from './handler.controller';
import { HandlerService } from './handler.service';

@Module({
    imports: [InternalModule],
    providers: [HandlerService],
    controllers: [HandlerController],
    exports: [HandlerService],
})
export class HandlerModule {}
