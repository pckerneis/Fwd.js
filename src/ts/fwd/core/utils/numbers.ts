export function map(value: number, 
    sourceMin: number, sourceMax: number, 
    targetMin: number, targetMax: number) {
  return (value - sourceMin) 
      * (targetMax - targetMin) / (sourceMax - sourceMin) 
      + targetMin;
}

export function parseNumber(str: any) {
  return str == null ? 0 :
    (typeof str === 'number' ? str :
      (typeof str === 'string' ? Number.parseFloat(str) : 0));
}
