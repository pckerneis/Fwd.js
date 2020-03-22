import FwdWebRunner from './fwd/runner/FwdWebRunner';

document.addEventListener('DOMContentLoaded', () => {
  const runner = new FwdWebRunner();
  
  import('./sketch').then(module => {
    runner.entryPoint = module.init;
  });
});