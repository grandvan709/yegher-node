import { createZodDto } from 'nestjs-zod';

import { StopTtCommand } from '@libs/contracts/commands';

export class StopTtResponseDto extends createZodDto(StopTtCommand.ResponseSchema) {}
