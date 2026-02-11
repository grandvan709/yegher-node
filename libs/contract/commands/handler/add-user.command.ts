import { z } from 'zod';

import { REST_API } from '../../api';

export namespace AddUserCommand {
    export const url = REST_API.HANDLER.ADD_USER;

    /**
     * TrustTunnel user model: each user has a username and password.
     * The 'type' field is kept as 'trusttunnel' for compatibility with the panel contract.
     * The 'tag' field maps to the inbound tag on the panel side.
     */
    const TrustTunnelUser = z.object({
        type: z.string().default('trusttunnel'),
        tag: z.string(),
        username: z.string(),
        password: z.string(),
    });

    export const RequestSchema = z.object({
        data: z.array(TrustTunnelUser),
    });

    export type Request = z.infer<typeof RequestSchema>;

    export const ResponseSchema = z.object({
        response: z.object({
            success: z.boolean(),
            error: z.string().nullable(),
        }),
    });

    export type Response = z.infer<typeof ResponseSchema>;
}
