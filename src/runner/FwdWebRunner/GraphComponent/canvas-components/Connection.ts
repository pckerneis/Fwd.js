import { clamp } from '../../../../fwd/utils/numbers';
import { Point } from '../../canvas/Rectangle';
import { SelectableItem } from '../../canvas/shared/SelectedItemSet';
import { GraphRoot } from './GraphRoot';
import { Pin } from './Pin';

export interface TemporaryConnection {
  endPosition: Point;
  readonly sourcePin: Pin;
}

export class Connection implements SelectableItem {
  constructor(public readonly graphRoot: GraphRoot,
              public readonly first: number,
              public readonly second: number,
              public readonly selected: boolean) {
  }

  public hitTest(position: Point): boolean {
    const maxDistanceSquared = 16;
    const start = this.getFirstPosition();
    const end = this.getSecondPosition();
    return distanceToSegmentSquared(position, start, end) < maxDistanceSquared;
  }

  public getFirstPosition(): Point {
    return this.graphRoot.findPin(this.first)?.getBoundsInGraph()
      .translated(this.graphRoot.viewport.getViewOffset())
      .center;
  }

  public getSecondPosition(): Point {
    return this.graphRoot.findPin(this.second)?.getBoundsInGraph()
      .translated(this.graphRoot.viewport.getViewOffset())
      .center;
  }

  public draw(g: CanvasRenderingContext2D): void {
    const startPos = this.getFirstPosition();
    const endPos = this.getSecondPosition();
    drawConnection(g, startPos, endPos, this.selected);
  }
}

export function drawConnection(g: CanvasRenderingContext2D,
                               startPos: Point,
                               endPos: Point,
                               selected: boolean): void {
  g.strokeStyle = selected ? '#00a8ff' : 'black';
  g.lineWidth = selected ? 2 : 1;

  g.beginPath();
  g.moveTo(startPos.x, startPos.y);
  g.lineTo(endPos.x, endPos.y);
  g.stroke();
}

function squared(x: number): number {
  return x * x;
}

function squaredDistance(v: Point, w: Point): number {
  return squared(v.x - w.x) + squared(v.y - w.y);
}

function distanceToSegmentSquared(p: Point,
                                  v: Point,
                                  w: Point): number {
  const l2 = squaredDistance(v, w);

  if (l2 == 0) return squaredDistance(p, v);

  const t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  const constrained = clamp(t, 0, 1);

  return squaredDistance(p, {
    x: v.x + constrained * (w.x - v.x),
    y: v.y + constrained * (w.y - v.y),
  });
}
