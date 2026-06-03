export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'payments',
    password: process.env.DB_PASSWORD ?? 'payments',
    name: process.env.DB_NAME ?? 'payments_gateway',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'local_jwt_hmac_key',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
});
