import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty({ enum: ['created', 'duplicate'] })
  status!: 'created' | 'duplicate';

  @ApiProperty()
  duplicate!: boolean;
}
