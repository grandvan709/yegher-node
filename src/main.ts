import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as bodyParser from '@kastov/body-parser-with-zstd';
import { ZodValidationPipe } from 'nestjs-zod';
import { createLogger } from 'winston';
import compression from 'compression';
import * as winston from 'winston';
import helmet from 'helmet';
import morgan from 'morgan';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { parseNodePayload } from '@common/utils/decode-node-payload';
import { getStartMessage } from '@common/utils/get-start-message';
import { isDevelopment } from '@common/utils/is-development';
import { NotFoundExceptionFilter } from '@common/exception';
import { customLogFilter } from '@common/utils/filter-logs';
import { REST_API, ROOT } from '@libs/contracts/api';

import { AppModule } from './app.module';

const logger = createLogger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        customLogFilter(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS',
        }),
        winston.format.align(),
        nestWinstonModuleUtilities.format.nestLike('', {
            colors: true,
            prettyPrint: true,
            processId: false,
            appName: false,
        }),
    ),
    level: isDevelopment() ? 'debug' : 'info',
});

async function bootstrap(): Promise<void> {
    const nodePayload = parseNodePayload();

    const app = await NestFactory.create(AppModule, {
        httpsOptions: {
            key: nodePayload.nodeKeyPem,
            cert: nodePayload.nodeCertPem,
            ca: [nodePayload.caCertPem],
            requestCert: true,
            rejectUnauthorized: true,
        },
        bodyParser: false,
        logger: WinstonModule.createLogger({
            instance: logger,
        }),
    });

    app.use(
        bodyParser.json({
            limit: '1000mb',
        }),
    );

    const nodeHttpServer = app.getHttpServer();
    nodeHttpServer.keepAliveTimeout = 60_000;
    nodeHttpServer.headersTimeout = 61_000;

    app.use(compression());

    app.use(helmet());

    if (isDevelopment()) {
        app.use(morgan('short'));
    }

    app.useGlobalFilters(new NotFoundExceptionFilter());

    app.setGlobalPrefix(ROOT, {
        exclude: [
            '/' + REST_API.VISION.BLOCK_IP,
            '/' + REST_API.VISION.UNBLOCK_IP,
        ],
    });

    app.useGlobalPipes(new ZodValidationPipe());

    const config = app.get(ConfigService);

    await app.listen(Number(config.getOrThrow<string>('NODE_PORT')));

    app.enableShutdownHooks();

    logger.info(
        '\n' +
            (await getStartMessage(
                Number(config.getOrThrow<string>('NODE_PORT')),
                app,
            )) +
            '\n',
    );
}

void bootstrap();
