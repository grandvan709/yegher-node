import { createZodDto } from 'nestjs-zod';

import { GetStatusAndVersionCommand } from '@libs/contracts/commands';

export class GetTtStatusAndVersionResponseDto extends createZodDto(
    GetStatusAndVersionCommand.ResponseSchema,
) {}
