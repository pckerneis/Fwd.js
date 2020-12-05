import { List } from '../../../src/fwd/utils/lazy-list';

test('Laziness lets you do crazy stuff like', () => {
  const reduced = List.range<number>(0, Infinity)
    .drop(1000)
    .map(n => -n)
    .filter(n => n % 2 === 0)
    .take(2)
    .reduce((r, n) => r * n, 1);

  expect(reduced).toBe(1002000);

  const fib10 = List.fibonacci
    .take(10)
    .toArray();

  expect(fib10).toEqual([ 0, 1, 1, 2, 3, 5, 8, 13, 21, 34 ]);

  const strings = List.integers
    .zipWith(List.fibonacci, (x, y) => x * y)
    .map(x => `The result is ${x}!!`)
    .take(5)
    .toArray();

  expect(strings).toEqual([ 'The result is 0!!', 'The result is 1!!', 'The result is 2!!',
    'The result is 6!!', 'The result is 12!!' ]);
});
