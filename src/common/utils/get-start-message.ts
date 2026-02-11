import { getBorderCharacters, table } from 'table';
import { readPackageJSON } from 'pkg-types';

import { INestApplication } from '@nestjs/common';

import { TtService } from '../../modules/tt-core/tt.service';

export async function getStartMessage(appPort: number, app: INestApplication) {
    const pkg = await readPackageJSON();

    const ttService = app.get(TtService);

    const ttInfo = ttService.getTtInfo();

    return table(
        [
            ['Yegher Node — TrustTunnel VPN'],
            [`API Port: ${appPort}`],
            [`TrustTunnel: ${ttInfo.version || 'N/A'}`],
            [
                `SI: ${ttInfo.systemInfo?.cpuCores}C, ${ttInfo.systemInfo?.cpuModel}, ${ttInfo.systemInfo?.memoryTotal}`,
            ],
        ],
        {
            header: {
                content: `Yegher Node v${pkg.version}`,
                alignment: 'center',
            },
            columnDefault: {
                width: 60,
            },
            columns: {
                0: { alignment: 'center' },
                1: { alignment: 'center' },
            },
            drawVerticalLine: () => false,
            border: getBorderCharacters('ramac'),
        },
    );
}
