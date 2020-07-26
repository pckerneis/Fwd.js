import { ConfigurationPanel } from "../../../../src/runner/FwdWebRunner/components/ConfigurationPanel";

describe('ConfigurationPanel', () => {
  it('can be created', () => {
    const configurationPanel = new ConfigurationPanel();
    expect(configurationPanel).toBeTruthy();
  });
});
