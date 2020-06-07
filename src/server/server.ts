#!/usr/bin/env node
import { DevServer } from './DevServer';

const chalk = require('chalk');
const express = require('express');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const opn = require('opn');

let PORT = require('minimist')(process.argv.slice(2)).port || 3989;

// Prepare server
const server = express()
  .use(serveStatic('./'))
  .use('/', serveIndex('./', {}))
  .listen(PORT)
  .on('listening', () => {
    console.log('%s Serving at http://localhost:' + PORT, chalk.green.bold('READY'));
    opn('http://localhost:' + PORT);
  });

process.on('uncaughtException', (err => {
  return (err as any).errno === 'EADDRINUSE' ? server.listen(++PORT) : 0;
}));

new DevServer(server);
