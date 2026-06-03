import { config } from 'dotenv';

config();

process.env.JWT_SECRET ??= 'local_jwt_hmac_key';
