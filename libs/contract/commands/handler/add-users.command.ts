import { z } from 'zod';

import { REST_API } from '../../api';

export namespace AddUsersCommand {
    export const url = REST_API.HANDLER.ADD_USERS;

    /**
     * TrustTunnel batch add users.
     * Each user has a username and password.
     */
    export const RequestSchema = z.object({
        affectedInboundTags: z.array(z.string()),
        users: z.array(
            z.object({
                inboundData: z.array(
                    z.object({
                        type: z.string().default('trusttunnel'),
                        tag: z.string(),
                    }),
                ),

                userData: z.object({
                    userId: z.string(),
                    username: z.string(),
                    password: z.string(),
                }),
            }),
        ),
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
