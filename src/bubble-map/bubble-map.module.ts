import { Module } from '@nestjs/common';
import { BubbleMapService } from './services/bubble-map.service';
import { BubbleMapApiService } from './services/bubble-map-api.service';
import { CanvasRendererService } from './services/canvas-renderer.service';
import { HttpModule } from '@nestjs/axios';
import { BubbleMapUpdate } from './bubblemap.update';
import { GoPlusApiService } from './services/goplus-api.service';
import { CoinGeckoService } from './services/coingecko.service';
import BubbleMapScene from './bubble-map.scene';

@Module({
  imports: [HttpModule],
  providers: [
    BubbleMapService,
    BubbleMapApiService,
    CanvasRendererService,
    BubbleMapUpdate,
    GoPlusApiService,
    CoinGeckoService,
    BubbleMapScene,
  ],
  exports: [BubbleMapService, BubbleMapApiService, CoinGeckoService],
})
export class BubbleMapModule {}
