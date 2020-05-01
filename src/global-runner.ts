import { fwd } from "./fwd/core/Fwd";
import FwdRunner from './fwd/runner/FwdRunner';
import FwdWebRunner from './fwd/runner/FwdWebRunner/FwdWebRunner';
import { Logger, LoggerLevel } from "./fwd/utils/dbg";

Logger.runtimeLevel = LoggerLevel.error;

document.addEventListener('DOMContentLoaded', () => {
    const runner: FwdRunner = new FwdWebRunner();

    runner.entryPoint = () => {
        if (typeof (window as any).init === 'function') {
            (window as any).init();
        } else {
            runner.logger.err(null, `It seems like your sketch doesn't export a 'init' function.`);
        }
    };

    (window as any).fwd = fwd;

    if (typeof (window as any).init === 'function') {
        (window as any).init();
    }

    // TODO: action buttons are broken for now
    /*
    const m = require('./sketch');
    runner.sketchModule = require('./sketch');

    runner.actions = Object.keys(m)
        .filter((e) => typeof m[e] === 'function' 
                    && e !== 'init' 
                    && m[e].length === 0);
     */
});