/**
 * Allow to wait in tests with `await seconds(1);`
 *
 * @param time
 */
export async function seconds(time: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time * 1000);
  });
}


/**
 * Compared two numbers with a tolerance margin
 * @param a first element
 * @param b second element
 * @param tolerance a tolerance value
 * @returns truthy if `a` is between `b - tolerance` and `b + tolerance`
 */
export function tolerantCompare(a: number, b: number, tolerance: number): boolean {
  return a >= b - tolerance && a <= b + tolerance;
}