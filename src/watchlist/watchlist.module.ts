import { Module } from '@nestjs/common';
import { WatchlistUpdate } from './watchlist.update';
import { BubbleMapModule } from 'src/bubble-map/bubble-map.module';

@Module({
  imports: [BubbleMapModule],
  providers: [WatchlistUpdate],
})
export class WatchlistModule {}
