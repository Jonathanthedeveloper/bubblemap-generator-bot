import { Injectable } from '@nestjs/common';
import { createCanvas, type CanvasRenderingContext2D } from 'canvas';

type DrawCircleOptions = {
  x: number;
  y: number;
  radius: number;
  fill: string;
  stroke: string;
};

type DrawLineOptions = {
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction?: 'bidirectional' | 'forward' | 'backward';
  arrowLength?: number;
  arrowAngle?: number; // in degrees
};

@Injectable()
export class CanvasRendererService {
  createCanvas(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  drawCircle(ctx: CanvasRenderingContext2D, options: DrawCircleOptions) {
    ctx.beginPath();
    ctx.arc(options.x, options.y, options.radius, 0, Math.PI * 2);
    ctx.fillStyle = options.fill;
    ctx.fill();

    if (options.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawLine(ctx: CanvasRenderingContext2D, options: DrawLineOptions) {
    const {
      color,
      startX,
      startY,
      endX,
      endY,
      direction,
      arrowLength = 10,
      arrowAngle = 30,
    } = options;

    // Draw main line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    if (!direction) return;

    if (direction === 'forward' || direction === 'bidirectional') {
      this.drawArrowHead(
        ctx,
        startX,
        startY,
        endX,
        endY,
        arrowLength,
        arrowAngle,
      );
    }

    if (direction === 'backward' || direction === 'bidirectional') {
      this.drawArrowHead(
        ctx,
        endX,
        endY,
        startX,
        startY,
        arrowLength,
        arrowAngle,
      );
    }
  }

  private drawArrowHead(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    length: number,
    angleDeg: number,
  ) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const angle1 = angle + (Math.PI * angleDeg) / 180;
    const angle2 = angle - (Math.PI * angleDeg) / 180;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - length * Math.cos(angle1),
      toY - length * Math.sin(angle1),
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - length * Math.cos(angle2),
      toY - length * Math.sin(angle2),
    );
    ctx.stroke();
  }
}
