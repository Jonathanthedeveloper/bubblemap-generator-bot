import { Module } from '@nestjs/common';
import { SettingsUpdate } from './settings.update';
import { BubbleMapModule } from 'src/bubble-map/bubble-map.module';

@Module({
  imports: [BubbleMapModule],
  providers: [SettingsUpdate],
})
export class SettingsModule {}
