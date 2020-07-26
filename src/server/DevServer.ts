import { Logger, LoggerLevel } from '../utils/Logger';
import {
  CSS_TYPE,
  HANDSHAKE_MESSAGE,
  PING_MESSAGE,
  PONG_MESSAGE,
  REFRESH_TYPE, SAVE_TYPE,
  SKETCH_TYPE, WATCH_TYPE,
  WELCOME_TYPE,
} from './DevServer.constants';

const DBG = new Logger('DevServer', null, LoggerLevel.warn);

const chokidar = require('chokidar');
// tslint:disable-next-line:variable-name
const SocketServer = require('ws').Server;
const fs = require('fs');
const path = require('path');

export interface Client {
  id: number;
  ws: WebSocket;
  watched: string[];
}

export class DevServer {
  private readonly _wss: any;
  private _clients: Client[] = [];

  private latestId: number = 0;

  constructor(server: any) {
    this._wss = new SocketServer({server});

    this._wss.on('connection', (ws: WebSocket) => {
      this.addClient(ws);
    });

    this.watchFiles();
  }

  private static isLibraryFile(filePath: string): boolean {
    return filePath.includes('fwd-runner') && filePath.endsWith('.js');
  }

  private static sendSketch(client: Client, file: string, textContent?: string): void {
    try {
      textContent = textContent || fs.readFileSync(path.resolve(__dirname, '../../' + file), 'utf8');

      client.ws.send(JSON.stringify({
        type: SKETCH_TYPE,
        file,
        textContent,
      }));
    } catch (e) {
      DBG.error(e);
    }
  }

  private static sendWelcomePacket(ws: WebSocket): void {
    DBG.debug('Scan directory : ' + path.resolve(__dirname, '../../'));

    const files = fs.readdirSync(path.resolve(__dirname, '../../'))
      .filter((file: string) => file.endsWith('.js'))
      .filter((file: string) => ! file.endsWith('.config.js'));

    ws.send(JSON.stringify({
      type: WELCOME_TYPE,
      files,
    }));

    DBG.debug('Available files: ', files);
  }

  private addClient(ws: WebSocket): void {
    const client: Client = {
      ws,
      watched: [],
      id: this.latestId++,
    };

    DBG.info(`Adding new client (#${client.id})`);

    this._clients.push(client);

    let pongTimeout: any = null;
    let pingInterval: any = null;
    const maxTimeout = 5000;
    const pingTimeInterval = 30000;

    const ping = () => {
      DBG.debug(`Send ping to client #${client.id}.`);
      ws.send(PING_MESSAGE);

      pongTimeout = setTimeout(() => {
        this.removeClient(client);
        clearInterval(pingInterval);
        DBG.info(`Client #${client.id} ping timeout. ${this._clients.length} clients left.`);
      }, maxTimeout);
    };

    const pong = () => {
      DBG.debug(`Pong received from client #${client.id}.`);
      clearTimeout(pongTimeout);
    };

    pingInterval = setInterval(ping, pingTimeInterval);

    ws.onmessage = ev => {
      const message = ev.data;

      DBG.debug(`Received from client #${client.id}`, message.substr(0, 128));

      if (message === HANDSHAKE_MESSAGE) {
        DevServer.sendWelcomePacket(ws);
      } else if (message == PONG_MESSAGE) {
        pong();
      } else {
        try {
          const parsedMessage = JSON.parse(message);

          if (parsedMessage.type === WATCH_TYPE) {
            DBG.debug(`Watch file for client #${client.id} : ${parsedMessage.file}`);

            if (parsedMessage.file) {
              client.watched = [parsedMessage.file];
              DevServer.sendSketch(client, parsedMessage.file);
            }
          } else if (parsedMessage.type === SAVE_TYPE) {
            const pathToFile = path.resolve(__dirname, '../..', parsedMessage.file);
            DBG.debug('pathToFile', pathToFile);
            fs.writeFileSync(pathToFile, parsedMessage.textContent, 'utf8');
          }
        } catch (e) {
          DBG.error(e);
        }
      }
    }
  }

  private watchFiles(): void {
    chokidar
      .watch('.', {ignored: /src|.idea|node_modules|.config.js|\.git|[\/\\]\./})
      .on('change', (file: string) => {
        const textContent = fs.readFileSync(file, 'utf8');
        file = file.replace(__dirname, '');

        if (file.includes('.css')) {
          DBG.debug('CSS changes detected...');

          this._clients.forEach((client: Client) => {
            client.ws.send(JSON.stringify({
              type: CSS_TYPE,
              file,
              textContent,
            }));
          });
        } else if (DevServer.isLibraryFile(file)) {
          this._clients.forEach((client: Client) => {
            client.ws.send(JSON.stringify({
              type: REFRESH_TYPE,
            }));
          });
        } else if (file.endsWith('.js')) {
          const clientsWatching = this._clients.filter(client => {
            return client.watched.includes(file);
          });

          DBG.info(`Transmit sketch to ${clientsWatching.length} clients.`);

          clientsWatching.forEach(client => DevServer.sendSketch(client, file, textContent));
        }
      });
  }

  private removeClient(client: Client): void {
    this._clients = this._clients.filter(c => c !== client);
  }
}
