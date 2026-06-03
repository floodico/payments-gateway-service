import { config } from 'dotenv';

config();

process.env.JWT_SECRET ??= 'local_jwt_hmac_key';
process.env.WEBHOOK_SIGNATURE_SECRET ??= 'local_webhook_hmac_stub';
