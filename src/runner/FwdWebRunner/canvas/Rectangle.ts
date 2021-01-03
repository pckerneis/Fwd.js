export interface Point {
  x: number,
  y: number,
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
    this.x = Math.ceil(x);
    this.y = Math.ceil(y);
    this.width = Math.ceil(width);
    this.height = Math.ceil(height);
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
}

export function isPointInRectangle(point: Point, rect: IRectangle | Rectangle): boolean {
  if (point.x < rect.x || point.x > rect.x + rect.width) {
    return false;
  }

  return ! (point.y < rect.y || point.y > rect.y + rect.height);
}
