#!/usr/bin/env node
const chalk = require('chalk');
const express = require('express');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
// tslint:disable-next-line:variable-name
const SocketServer = require('ws').Server;
const fs = require('fs');
const chokidar = require('chokidar');
const path = require('path');

let PORT = require('minimist')(process.argv.slice(2)).port || 3989;

// Prepare server
const server = express()
  .use(serveStatic('./'))
  .use('/', serveIndex('./', {}))
  .listen(PORT)
  .on('listening', () => {
    console.log('%s Serving at http://localhost:' + PORT, chalk.green.bold('READY'))
  });

process.on('uncaughtException', (err => {
  return (err as any).errno === 'EADDRINUSE' ? server.listen(++PORT) : 0;
}));

const wss = new SocketServer({server});
const handshakeMessage = '__HANDSHAKE__';


interface Client {
  ws: WebSocket;
  watched: string[];
}

const clients: Client[] = [];

wss.on('connection', (ws: WebSocket) => {
  const client: Client = {
    ws,
    watched: [],
  };

  clients.push(client);

  ws.onmessage = ev => {
    const message = ev.data;

    console.debug('received: %s', message);
    if (message === handshakeMessage) {
      sendWelcomePacket(ws);
    } else {
      try {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'watch') {
          if (parsedMessage.file) {
            client.watched = [parsedMessage.file];
            sendSketch(client, parsedMessage.file);
          }
        }
      } catch(e) {
        console.error(e);
      }
    }
  }
});

function isLibraryFile(filePath: string): boolean {
  return filePath.includes('fwd-runner.js');
}

chokidar
  .watch('.', {ignored: /src|.idea|node_modules|\.git|[\/\\]\./})
  .on('change', (file: string) => {
    const textContent = fs.readFileSync(file, 'utf8');
    file = file.replace(__dirname, '');

    if (file.includes('.css')) {
      console.debug('CSS changes detected...');

      clients.forEach((client: Client) => {
        client.ws.send(JSON.stringify({
          type: 'cssInject',
          file,
          textContent,
        }));
      });
    } else if (isLibraryFile(file)) {
      clients.forEach((client: Client) => {
        client.ws.send(JSON.stringify({
          type: 'refresh',
        }));
      });
    } else if (file.endsWith('.js')) {
      const clientsWatching = clients.filter(client => {
        return client.watched.includes(file);
      });

      console.log(`Transmit sketch to ${clientsWatching.length} clients.`);

      clientsWatching.forEach(client => sendSketch(client, file, textContent));
    }
  });

function sendSketch(client: Client, file: string, textContent?: string): void {
  try {
    textContent = textContent || fs.readFileSync(path.resolve(__dirname, '../../' + file), 'utf8');

    client.ws.send(JSON.stringify({
      type: 'sketch',
      file,
      textContent,
    }));
  } catch (e) {
    console.error(e);
  }
}

function sendWelcomePacket(ws: WebSocket): void {
  console.log('sendWelcomePacket');

  // const textContent = fs.readFileSync(path.resolve(__dirname, '../sketch.js'), 'utf8');

  console.log('Scan directory : ' + path.resolve(__dirname, '../../'));

  const files = fs.readdirSync(path.resolve(__dirname, '../../'))
    .filter((file: string) => file.endsWith('.js'));

  ws.send(JSON.stringify({
    type: 'welcome',
    files,
  }));

  console.log('files', files);
}
