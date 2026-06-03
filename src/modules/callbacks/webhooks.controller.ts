import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  BRAND_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
} from '../common/constants';
import { CallbackService, resolveBrandId, resolveIdempotencyKey } from './callback.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { CallbackSource } from './interfaces/callback-source';
import {
  assertWebhookSignature,
  extractSignatureHeader,
} from './utils/signature.validator';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly callbackService: CallbackService) {}

  @Post('psp/:provider')
  async handlePsp(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: WebhookPayloadDto,
    @Res({ passthrough: true }) res: { status: (code: number) => void },
  ): Promise<WebhookResponseDto> {
    return this.handle('psp', provider, headers, body, res);
  }

  @Post('gsp/:provider')
  async handleGsp(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: WebhookPayloadDto,
    @Res({ passthrough: true }) res: { status: (code: number) => void },
  ): Promise<WebhookResponseDto> {
    return this.handle('gsp', provider, headers, body, res);
  }

  private async handle(
    source: CallbackSource,
    provider: string,
    headers: Record<string, string | string[] | undefined>,
    body: WebhookPayloadDto,
    res: { status: (code: number) => unknown },
  ): Promise<WebhookResponseDto> {
    assertWebhookSignature(
      extractSignatureHeader(headers),
      this.callbackService.getSignatureSecret(),
    );

    const brandId = resolveBrandId(this.headerValue(headers, BRAND_ID_HEADER));
    const idempotencyKey = resolveIdempotencyKey(
      this.headerValue(headers, IDEMPOTENCY_KEY_HEADER),
      body as unknown as Record<string, unknown>,
    );

    const result = await this.callbackService.handleWebhook({
      source,
      provider,
      brandId,
      idempotencyKey,
      body,
    });

    res.status(result.duplicate ? HttpStatus.OK : HttpStatus.CREATED);
    return result;
  }

  private headerValue(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
