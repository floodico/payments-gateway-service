import {
  applyDecorators,
  Body,
  Controller,
  Headers,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  BRAND_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
} from '../common/constants';
import { DEMO_BRAND_ID } from '../common/demo.constants';
import { CallbackService, resolveBrandId, resolveIdempotencyKey } from './callback.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { CallbackSource } from './interfaces/callback-source';
import {
  assertWebhookSignature,
  extractSignatureHeader,
} from './utils/signature.validator';

function ApiWebhookHeaders() {
  return applyDecorators(
    ApiHeader({ name: BRAND_ID_HEADER, required: true, example: DEMO_BRAND_ID }),
    ApiHeader({
      name: IDEMPOTENCY_KEY_HEADER,
      required: true,
      example: 'evt-liqpay-001',
    }),
    ApiHeader({
      name: WEBHOOK_SIGNATURE_HEADER,
      required: true,
      example: 'local_webhook_hmac_stub',
    }),
  );
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly callbackService: CallbackService) {}

  @Post('psp/:provider')
  @ApiParam({ name: 'provider', example: 'liqpay' })
  @ApiCreatedResponse({ type: WebhookResponseDto, description: 'New event' })
  @ApiOkResponse({ type: WebhookResponseDto, description: 'Duplicate delivery' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing signature' })
  @ApiWebhookHeaders()
  async handlePsp(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: WebhookPayloadDto,
    @Res({ passthrough: true }) res: { status: (code: number) => void },
  ): Promise<WebhookResponseDto> {
    return this.handle('psp', provider, headers, body, res);
  }

  @Post('gsp/:provider')
  @ApiParam({ name: 'provider', example: 'wayforpay' })
  @ApiCreatedResponse({ type: WebhookResponseDto, description: 'New event' })
  @ApiOkResponse({ type: WebhookResponseDto, description: 'Duplicate delivery' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing signature' })
  @ApiWebhookHeaders()
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
