import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { AppUpdate } from './app.update';
import { BubbleMapModule } from './bubble-map/bubble-map.module';
import { session } from 'telegraf';
import { SettingsModule } from './settings/settings.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { CacheModule } from '@nestjs/cache-manager';
import { MySQL } from '@telegraf/session/mysql';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        TELEGRAM_BOT_TOKEN: Joi.string().required(),
        DB_HOST: Joi.string().required().default('localhost'),
        DB_USER: Joi.string().required().default('root'),
        DB_PASSWORD: Joi.string().optional().allow(''),
        DB_DATABASE: Joi.string().required(),
        DB_PORT: Joi.string(),
      }),
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 1000 * 60 * 60,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const store = MySQL({
          host: configService.get<string>('DB_HOST'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          port: parseInt(configService.get('DB_PORT'), 10),
        });
        return {
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
          middlewares: [session({ store })],
        };
      },
    }),
    BubbleMapModule,
    SettingsModule,
    WatchlistModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppUpdate],
})
export class AppModule {}
