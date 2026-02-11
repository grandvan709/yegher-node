import { z } from 'zod';

import { REST_API } from '../../api';

export namespace GetNodeHealthCheckCommand {
    export const url = REST_API.TT.NODE_HEALTH_CHECK;

    export const ResponseSchema = z.object({
        response: z.object({
            isAlive: z.boolean(),
            ttInternalStatusCached: z.boolean(),
            ttVersion: z.string().nullable(),
            nodeVersion: z.string(),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
