import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { Request } from 'express';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { CallbacksModule } from './modules/callbacks/callbacks.module';
import { CommonModule } from './modules/common/common.module';
import { GlobalExceptionFilter } from './modules/common/filters/global-exception.filter';
import { CorrelationIdMiddleware } from './modules/common/middleware/correlation-id.middleware';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        // pino-pretty is a devDependency — enable only locally via LOG_PRETTY=true
        transport:
          process.env.LOG_PRETTY === 'true'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              }
            : undefined,
        customProps: (req) => {
          const request = req as Request;
          return { correlationId: request.correlationId ?? req.id };
        },
      },
    }),
    DatabaseModule,
    CommonModule,
    IdentityModule,
    CallbacksModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
