import { Global, Module } from '@nestjs/common';
import { TtWrapperClient } from './tt-wrapper.client';

@Global()
@Module({
    providers: [TtWrapperClient],
    exports: [TtWrapperClient],
})
export class TtWrapperModule {}
