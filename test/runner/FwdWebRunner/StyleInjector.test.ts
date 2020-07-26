import { injectStyle } from "../../../src/runner/FwdWebRunner/StyleInjector";

describe('StyleInjector', () => {
  it('registers styles before the DOM is ready', () => {
    injectStyle('MyStyle', '');
  });
});
