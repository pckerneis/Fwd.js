#!/usr/bin/env node
import { DevServer } from './DevServer';

const chalk = require('chalk');
const express = require('express');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const opn = require('opn');
const path = require('path');

const args = require('minimist')(process.argv.slice(2));

let PORT = args.port || 3989;
const directoryToServe = path.resolve(__dirname, args.path || '.');
const openBrowser = args.open;

// Prepare server
const server = express()
  .use(serveStatic(directoryToServe))
  .use('/', serveIndex(directoryToServe, {}))
  .listen(PORT)
  .on('listening', () => {
    console.log('%s Serving ' + directoryToServe + ' at http://localhost:' + PORT, chalk.green.bold('READY'));

    if (openBrowser) {
      opn('http://localhost:' + PORT);
    }
  });

process.on('uncaughtException', (err => {
  return (err as any).errno === 'EADDRINUSE' ? server.listen(++PORT) : 0;
}));

new DevServer(server, directoryToServe);
