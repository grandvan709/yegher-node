import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { TtWrapperModule } from '@common/tt-wrapper';
import { JwtStrategy } from '@common/guards/jwt-guards/strategies/validate-token';
import { validateEnvConfig } from '@common/utils/validate-env-config';
import { configSchema, Env } from '@common/config/app-config';
import { getJWTConfig } from '@common/config/jwt/jwt.config';

import { YegherNodeModules } from './modules/remnawave-node.modules';
import { InternalModule } from './modules/internal/internal.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            validate: (config) => validateEnvConfig<Env>(configSchema, config),
        }),
        TtWrapperModule,
        YegherNodeModules,
        InternalModule,
        JwtModule.registerAsync(getJWTConfig()),
    ],
    providers: [JwtStrategy],
    exports: [],
})
export class AppModule {}
