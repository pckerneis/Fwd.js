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
