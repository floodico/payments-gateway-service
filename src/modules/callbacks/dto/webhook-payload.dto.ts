import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class WebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  eventType!: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
