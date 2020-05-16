import { fwd } from "./fwd/core/Fwd";
import rootLogger from './fwd/logger.fwd';
import FwdRunner from './fwd/runner/FwdRunner';
import FwdWebRunner from './fwd/runner/FwdWebRunner/FwdWebRunner';
import { Logger, LoggerLevel } from "./fwd/utils/dbg";

Logger.runtimeLevel = LoggerLevel.error;

const DBG = new Logger('global-runner', rootLogger);

let sketchModule: any;

// TODO: action buttons are broken for now

function executeSketchCode(str: any): void {
    const firstTimeReceived = sketchModule == null;

    sketchModule = Function(str);

    if (firstTimeReceived) {
        sketchModule();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const runner: FwdRunner = new FwdWebRunner();

    runner.entryPoint = () => {
        if (sketchModule == null) {
            runner.logger.err(null, `The sketch file is not ready or could not be found.`);
        }

        sketchModule();

        if (typeof (window as any).init === 'function') {
            (window as any).init();
        } else {
            runner.logger.err(null, `It seems like your sketch doesn't export a 'init' function.`);
        }
    };

    (window as any).fwd = fwd;

    const ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
    const handshakeMessage = '__HANDSHAKE__';

    ws.onmessage = msg => {
        DBG.debug('Message received from server.');

        try {
            const { type, textContent } = JSON.parse(msg.data);

            if (type === 'sketch') {
                DBG.debug('Sketch received.');
                executeSketchCode(textContent);
            } else if (type === 'cssInject') {
                DBG.debug('Stylesheet received.');
                Array.from(document.querySelectorAll('link'))
                 // .filter(link => link.href.includes(path))
                  .forEach(link => {
                      link.href = link.href;
                      DBG.debug('Refresh style sheet', link.href);
                  });
            }
        } catch (e) {
            DBG.error('Unhandled message received from server.');
        }
    };

    ws.onopen = () => {
        ws.send(handshakeMessage);
    };

    // Wait for gesture to start audio
    const firstGestureListener = () => {
        DBG.info('Starting audio context.');
        document.removeEventListener("mousedown", firstGestureListener);
    };

    document.addEventListener("mousedown", firstGestureListener);
});

