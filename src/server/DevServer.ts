import { Logger, LoggerLevel } from '../fwd/utils/Logger';
import { HANDSHAKE_MESSAGE, MessageType, PING_MESSAGE, PONG_MESSAGE, ServerMessage } from './DevServer.constants';

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

  constructor(server: any,
              public readonly rootPath: string,
              public readonly pathToPrograms: string = 'programs') {
    this._wss = new SocketServer({server});

    this._wss.on('connection', (ws: WebSocket) => {
      this.addClient(ws);
    });

    this.watchFiles();
  }

  private static isLibraryFile(filePath: string): boolean {
    return filePath.includes('fwd-runner') && filePath.endsWith('.js');
  }

  private static sendSketch(client: Client, file: string, pathToPrograms: string): void {
    try {
      const textContent = fs.readFileSync(
        path.resolve(pathToPrograms, file),
        'utf8');

      this.sendMessage(client.ws, {
        type: MessageType.SKETCH_TYPE,
        program: {
          filename: file,
          content: textContent,
        },
      });
    } catch (e) {
      DBG.error(e);
    }
  }

  private static sendWelcomePacket(ws: WebSocket, rootPath: string): void {
    DBG.debug('Scan directory : ' + path.resolve(rootPath));

    const files = DevServer.readdirRecursive(rootPath)
      .map(f => path.relative(rootPath, f));

    this.sendMessage(ws, {type: MessageType.WELCOME_TYPE, files});

    DBG.debug('Available files: ', files);
  }

  private static readdirRecursive(rootPath: string): string[] {
    const items = fs.readdirSync(rootPath);

    DBG.debug('reading ' + rootPath, items);

    const results = items
      .filter((file: string) => this.isExecutableFile(file))
      .map((file: string) => path.resolve(rootPath, file));

    items.forEach((file: string) => {
      const fullPathToFile = path.resolve(rootPath, file);
      const stat = fs.statSync(fullPathToFile);

      if (stat && stat.isDirectory()) {
        DBG.debug('Found directory ' + file);

        const res = this.readdirRecursive(fullPathToFile);
        results.push(...res);
      }
    });

    return results;
  }

  private static sendMessage(ws: WebSocket, message: ServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  private static isExecutableFile(file: string): boolean {
    return file.endsWith('.js');
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

      const fullPathToPrograms = this.getFullPathToPrograms();

      DBG.debug(`Received from client #${client.id}`, message.substr(0, 128));

      if (message === HANDSHAKE_MESSAGE) {
        DevServer.sendWelcomePacket(ws, fullPathToPrograms);
      } else if (message == PONG_MESSAGE) {
        pong();
      } else {
        try {
          const parsedMessage = JSON.parse(message);

          if (parsedMessage.type === MessageType.WATCH_TYPE) {
            DBG.debug(`Watch file for client #${client.id} : ${parsedMessage.file}`);

            if (parsedMessage.file) {
              client.watched = [parsedMessage.file];
              DevServer.sendSketch(client, parsedMessage.file, fullPathToPrograms);
            }
          } else if (parsedMessage.type === MessageType.SAVE_TYPE) {
            DBG.debug('Received file', parsedMessage.file);
            const pathToFile = path.resolve(fullPathToPrograms, parsedMessage.file);
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
    const fullPathToPrograms = this.getFullPathToPrograms();

    chokidar
      .watch(fullPathToPrograms, {ignored: /src|.idea|node_modules|.config.js|\.git|[\/\\]\./})
      .on('change', (file: string) => {
        const textContent = fs.readFileSync(file, 'utf8');
        file = path.relative(fullPathToPrograms, file)

        DBG.debug('changed: ' + file);

        if (file.includes('.css')) {
          DBG.debug('CSS changes detected...');

          this._clients.forEach((client: Client) => {
            client.ws.send(JSON.stringify({
              type: MessageType.CSS_TYPE,
              file,
              textContent,
            }));
          });
        } else if (DevServer.isLibraryFile(file)) {
          this._clients.forEach((client: Client) => {
            client.ws.send(JSON.stringify({
              type: MessageType.REFRESH_TYPE,
            }));
          });
        } else if (DevServer.isExecutableFile(file)) {
          const clientsWatching = this._clients.filter(client => {
            return client.watched.includes(file);
          });

          if (clientsWatching.length !== 0) {
            DBG.info(`Transmit changes to ${clientsWatching.length} clients.`);
            clientsWatching.forEach(client => DevServer.sendSketch(client, file, fullPathToPrograms));
          }
        }
      });
  }

  private removeClient(client: Client): void {
    this._clients = this._clients.filter(c => c !== client);
  }

  private getFullPathToPrograms(): string {
    return path.resolve(this.rootPath, this.pathToPrograms);
  }
}
