export class WebhookResponseDto {
  eventId!: string;
  status!: 'created' | 'duplicate';
  duplicate!: boolean;
}
