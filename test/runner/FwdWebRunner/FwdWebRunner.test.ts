import FwdWebRunner from '../../../src/runner/FwdWebRunner/FwdWebRunner';

import { mockFwd } from '../../mocks/Fwd.mock';

describe('FwdWebRunner', () => {
  it('creates a runner', () => {
    const runner = new FwdWebRunner(mockFwd(), {
      darkMode: false,
      useConsoleTimePrefix: false,
      useConsoleRedirection: false,
      writeToFile: false,
      useCodeEditor: false,
    });

    expect(runner).not.toBeNull();
  });
});
