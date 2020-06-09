import { Logger, LoggerLevel } from '../client/fwd/utils/Logger';
import {
  CSS_TYPE, HANDSHAKE_MESSAGE,
  PING_MESSAGE,
  PONG_MESSAGE,
  REFRESH_TYPE, SAVE_TYPE,
  SKETCH_TYPE,
  WATCH_TYPE,
  WELCOME_TYPE,
} from './DevServer.constants';

const DBG = new Logger('DevClient', null, LoggerLevel.error);

export class DevClient {
  public readonly _ws: WebSocket;

  public onFilesAvailable: (files: string[]) => void;
  public onFileChange: (file: string, textContent: string) => void;

  constructor() {
    this._ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
    this._ws.onmessage = msg => this.handleMessage(msg);
    this._ws.onopen = () => this._ws.send(HANDSHAKE_MESSAGE);
  }

  public watchFile(file: string): void {
    this._ws.send(JSON.stringify({
      type: WATCH_TYPE,
      file,
    }));
  }

  public saveFile(file: string, textContent: string): void {
    DBG.debug('Save file', file);

    this._ws.send(JSON.stringify({
      type: SAVE_TYPE,
      file,
      textContent,
    }));
  }

  private handleMessage(msg: any): void {
    DBG.debug('Message received from server.');

    if (msg.data == PING_MESSAGE) {
      this._ws.send(PONG_MESSAGE);
      return;
    }

    try {
      const {type, textContent, files, file} = JSON.parse(msg.data);
      DBG.debug(type);

      if (type === WELCOME_TYPE) {
        DBG.debug('Welcome received.');

        if (typeof this.onFilesAvailable === 'function') {
          this.onFilesAvailable(files);
        }
      } else if (type === SKETCH_TYPE) {
        DBG.debug('Sketch received.');

        if (typeof this.onFileChange === 'function') {
          this.onFileChange(file, textContent);
        }
      } else if (type === CSS_TYPE) {
        DBG.debug('Stylesheet received.');
        Array.from(document.querySelectorAll('link'))
          .forEach(link => {
            link.href = link.href;
            DBG.debug('Refresh style sheet', link.href);
          });

      } else if (type === REFRESH_TYPE) {
        DBG.debug('Refreshing...');
        location.reload();
      }
    } catch (e) {
      DBG.error(e);
    }
  }
}
