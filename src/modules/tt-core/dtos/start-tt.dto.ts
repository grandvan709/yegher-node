import { createZodDto } from 'nestjs-zod';

import { StartTtCommand } from '@libs/contracts/commands';

export class StartTtRequestDto extends createZodDto(StartTtCommand.RequestSchema) {}
export class StartTtResponseDto extends createZodDto(StartTtCommand.ResponseSchema) {}
