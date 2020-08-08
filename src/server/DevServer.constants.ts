// Constants used in messages
export const HANDSHAKE_MESSAGE = '__HANDSHAKE__';
export const PING_MESSAGE = '__PING__';
export const PONG_MESSAGE = '__PONG__';

export enum MessageType {
  REFRESH_TYPE = 'refresh',
  WELCOME_TYPE = 'welcome',
  SKETCH_TYPE = 'sketch',
  ERROR_TYPE = 'error',
  WATCH_TYPE = 'watch',
  SAVE_TYPE = 'save',
  CSS_TYPE = 'css',
}

export interface Program {
  file: string,
  code: string,
  executable: string,
}

export interface ServerMessage {
  type: MessageType,
  program?: Program,
  error?: any,
  files?: string[];
}
