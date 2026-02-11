import { z } from 'zod';

import { REST_API } from '../../api';
export namespace StopTtCommand {
    export const url = REST_API.TT.STOP;

    export const ResponseSchema = z.object({
        response: z.object({
            isStopped: z.boolean(),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
