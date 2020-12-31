import { Logger, LoggerLevel } from '../fwd/utils/Logger';
import {
  FileResource,
  HANDSHAKE_MESSAGE,
  MessageType,
  PING_MESSAGE,
  PONG_MESSAGE,
  ServerMessage,
} from './DevServer.constants';

const DBG = new Logger('DevClient', null, LoggerLevel.error);

export class DevClient {

  public onFilesAvailable: (files: string[]) => void;
  public onFileChange: (file: string, program: FileResource) => void;
  public onServerError: (errors: string[], program: FileResource) => void;
  public onServerLost: () => void;

  private _ws: WebSocket;

  constructor() {
  }

  public connect(): void {
    this._ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
    this._ws.onmessage = msg => this.handleMessage(msg);
    this._ws.onopen = () => this._ws.send(HANDSHAKE_MESSAGE);

    this.checkStatusPeriodically();
  }

  public watchFile(file: string): void {
    this._ws.send(JSON.stringify({
      type: MessageType.WATCH_TYPE,
      file,
    }));
  }

  public saveFile(file: string, textContent: string): void {
    DBG.debug('Save file', file);

    this._ws.send(JSON.stringify({
      type: MessageType.SAVE_TYPE,
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
      const message: ServerMessage = JSON.parse(msg.data);
      DBG.debug(message.type);

      if (message.type === MessageType.WELCOME_TYPE) {
        DBG.debug('Welcome received.');

        if (typeof this.onFilesAvailable === 'function') {
          this.onFilesAvailable(message.files);
        }
      } else if (message.type === MessageType.SKETCH_TYPE) {
        DBG.debug('Sketch received.');

        if (typeof this.onFileChange === 'function') {
          this.onFileChange(message.program.filename, message.program);
        }
      } else if (message.type === MessageType.CSS_TYPE) {
        DBG.debug('Stylesheet received.');
        Array.from(document.querySelectorAll('link'))
          .forEach(link => {
            link.href = link.href;
            DBG.debug('Refresh style sheet', link.href);
          });

      } else if (message.type === MessageType.REFRESH_TYPE) {
        DBG.debug('Refreshing...');
        location.reload();
      } else if (message.type === MessageType.ERROR_TYPE) {
        DBG.debug('Error', message.error);

        if (typeof this.onServerError === 'function') {
          this.onServerError([message.error], message.program);
        }
      }
    } catch (e) {
      DBG.error(e);
    }
  }

  private checkStatusPeriodically(): void {
    const itv = setInterval(() => {
      if (this._ws.readyState !== 1) {
        if (typeof this.onServerError === 'function') {
          this.onServerLost();
        }
        clearInterval(itv);
      }
    }, 3000);
  }
}
