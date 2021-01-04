export interface Point {
  x: number,
  y: number,
}

export class Points {
  public static origin(): Point {
    return {x: 0, y: 0};
  }

  public static add(...points: readonly Point[]): Point {
    return points.reduce(
      (acc, curr) => {
        acc.x += curr.x;
        acc.y += curr.y;
        return acc;
      },
      Points.origin());
  }

  public static lerp(first: Point, second: Point, ratio: number): Point {
    return {
      x: lerp(first.x, second.x, ratio),
      y: lerp(first.y, second.y, ratio),
    }
  }

  public static equal(first: Point, second: Point): boolean {
    return first.x === second.x && first.y === second.y;
  }

  public static isOrigin(point: Point): Boolean {
    return this.equal(point, this.origin());
  }
}

function lerp(a: number, b: number, normal: number): number {
  return (1 - normal) * a + normal * b;
}

export interface IRectangle {
  x: number,
  y: number,
  width: number,
  height: number,
}

export class Rectangle implements IRectangle {
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public static fromIBounds(bounds: IRectangle): Rectangle {
    if (! Boolean(bounds)) {
      return new Rectangle();
    }

    return new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  public static intersect(box1: IRectangle, box2: IRectangle): boolean {
    return ! ((box2.x >= box1.x + box1.width) || (box2.x + box2.width <= box1.x)
      || (box2.y >= box1.y + box1.height) || (box2.y + box2.height <= box1.y));
  }

  public static findOuterBounds(bounds: IRectangle[]): Rectangle {
    return Rectangle.fromIBounds(findOuterBounds(bounds));
  }

  public get topLeft(): Point {
    return {
      x: this.x,
      y: this.y,
    }
  }

  public get center(): Point {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    }
  }

  public contains(point: Point): boolean {
    return isPointInRectangle(point, this);
  }

  public asIBounds(): IRectangle {
    return {x: this.x, y: this.y, height: this.height, width: this.width};
  }

  public clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }

  public removeFromLeft(amount: number): Rectangle {
    amount = Math.floor(Math.max(0, Math.min(amount, this.width)));

    const removed = new Rectangle(this.x, this.y, amount, this.height);

    this.x += amount;
    this.width -= amount;

    return removed;
  }

  public removeFromTop(amount: number): Rectangle {
    amount = Math.floor(Math.max(0, Math.min(amount, this.height)));

    const removed = new Rectangle(this.x, this.y, this.width, amount);

    this.y += amount;
    this.height -= amount;

    return removed;
  }

  public removeFromBottom(amount: number): Rectangle {
    amount = Math.floor(Math.max(0, Math.min(amount, this.height)));

    const removed = new Rectangle(this.x, this.height - amount, this.width, amount);

    this.height -= amount;

    return removed;
  }

  public removeFromRight(amount: number): Rectangle {
    amount = Math.floor(Math.max(0, Math.min(amount, this.width)));

    const removed = new Rectangle(this.x + this.width - amount,
      this.y, amount, this.height);

    this.width -= amount;

    return removed;
  }

  public translated(offset: Point): Rectangle {
    return new Rectangle(
      this.x + offset.x,
      this.y + offset.y,
      this.width, this.height);
  }

  public withX(x: number): Rectangle {
    return this.translated({x, y: 0});
  }

  public withWidth(width: number): Rectangle {
    return Rectangle.fromIBounds({...this.asIBounds(), width});
  }

  public withHeight(height: number): Rectangle {
    return Rectangle.fromIBounds({...this.asIBounds(), height});
  }

  public withY(y: number): Rectangle {
    return this.translated({x: 0, y});
  }

  public withTrimmedLeft(amount: number): Rectangle {
    return this.withX(amount).withWidth(this.width - amount);
  }

  public withTrimmedTop(amount: number): Rectangle {
    return this.withY(amount).withHeight(this.height - amount);
  }

  public withTrimmedRight(amount: number): Rectangle {
    return this.withWidth(this.height - amount);
  }

  public withTrimmedBottom(amount: number): Rectangle {
    return this.withHeight(this.height - amount);
  }

  public extended(amount: number): Rectangle {
    return this.withX(this.x - amount)
      .withWidth(this.width + 2 * amount)
      .withY(this.y - amount)
      .withHeight(this.height + 2 * amount);
  }

  public scaled(factor: number): Rectangle {
    return Rectangle.fromIBounds(scaleRectangle(this.asIBounds(), factor));
  }

  public reduced(amount: number): Rectangle {
    return this.extended(-amount);
  }
}

export function isPointInRectangle(point: Point, rect: IRectangle | Rectangle): boolean {
  if (point.x < rect.x || point.x > rect.x + rect.width) {
    return false;
  }

  return ! (point.y < rect.y || point.y > rect.y + rect.height);
}

function findOuterBounds(rectangles: IRectangle[]): IRectangle {
  if (rectangles.length === 0) {
    return null;
  } else if (rectangles.length === 1) {
    return Rectangle.fromIBounds(rectangles[0]);
  }

  let left: number = Infinity,
    top: number = Infinity,
    right: number = -Infinity,
    bottom: number = -Infinity;

  rectangles.forEach(rect => {
    left = Math.min(rect.x, left ?? rect.x);
    top = Math.min(rect.y, top ?? rect.y);
    right = Math.max(rect.x + rect.width, right ?? rect.x + rect.width);
    bottom = Math.max(rect.y + rect.height, bottom ?? rect.y + rect.height);
  });

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function scaleRectangle(rectangle: IRectangle, ratio: number): IRectangle {
  return {
    x: rectangle.x * ratio,
    y: rectangle.y * ratio,
    width: rectangle.width * ratio,
    height: rectangle.height * ratio,
  }
}
