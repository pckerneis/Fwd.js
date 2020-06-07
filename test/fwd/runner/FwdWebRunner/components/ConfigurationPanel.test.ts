import { ConfigurationPanel } from "../../../../../src/client/fwd/runner/FwdWebRunner/components/ConfigurationPanel";

describe('ConfigurationPanel', () => {
  it('can be created', () => {
    const configurationPanel = new ConfigurationPanel();
    expect(configurationPanel).toBeTruthy();
  });
});
