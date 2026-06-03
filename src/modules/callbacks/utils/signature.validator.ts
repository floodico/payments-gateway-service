import { UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { WEBHOOK_SIGNATURE_HEADER } from '../../common/constants';

export function assertWebhookSignature(
  signature: string | undefined,
  expectedSecret: string,
): void {
  if (!signature?.trim()) {
    throw new UnauthorizedException('Missing webhook signature');
  }

  const received = Buffer.from(signature.trim());
  const expected = Buffer.from(expectedSecret);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
}

export function extractSignatureHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = headers[WEBHOOK_SIGNATURE_HEADER];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
