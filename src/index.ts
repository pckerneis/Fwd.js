import FwdRunner from './fwd/runner/FwdRunner';
import FwdWebRunner from './fwd/runner/FwdWebRunner/FwdWebRunner';
import { Logger, LoggerLevel } from "./fwd/utils/dbg";

Logger.runtimeLevel = LoggerLevel.error;

document.addEventListener('DOMContentLoaded', () => {
    const runner: FwdRunner = new FwdWebRunner();

    runner.entryPoint = () => {
        const module = hardLoadModule();
        runner.sketchModule = module;

        if (typeof module['init'] === 'function') {
            module.init();
        } else {
            runner.logger.err(null, `It seems like your sketch doesn't export a 'init' function.`);
        }
    };

    const m = require('./sketch');
    runner.sketchModule = require('./sketch');

    runner.actions = Object.keys(m)
        .filter((e) => typeof m[e] === 'function' 
                    && e !== 'init' 
                    && m[e].length === 0);
});

function hardLoadModule(): any {
    delete require.cache[require.resolve('./sketch')];
    return module = require('./sketch') as any;
}
