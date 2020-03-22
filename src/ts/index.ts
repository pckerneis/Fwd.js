import FwdWebRunner from './fwd/runner/FwdWebRunner';

document.addEventListener('DOMContentLoaded', () => {
  const runner = new FwdWebRunner();

  runner.entryPoint = () => {
    delete require.cache[require.resolve('./sketch')];
    const module = require('./sketch') as any;

    if (typeof module['init'] === 'function') {
      module.init();
    } else {
      runner.logger.err(null, `It seems that your sketch doesn't have a exported init function.`);
    }
  }
});
