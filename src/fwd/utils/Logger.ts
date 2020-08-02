export enum LoggerLevel {
  all,
  debug,
  info,
  warn,
  error,
  none,
}

type LogMethod = 'warn' | 'log' | 'error';

export class Logger {

  public static runtimeLevel: LoggerLevel = null;

  public readonly pathLength: number = 32;

  constructor(public readonly identifier: string,
              public readonly parentLogger: Logger = null,
              public level: LoggerLevel = null) {}


  public info(...messages: any[]): void {
    if (this.getLevel() <= LoggerLevel.info) {
      this.print('log', ...messages);
    }
  }

  public debug(...messages: any[]): void {
    if (this.getLevel() <= LoggerLevel.debug) {
      this.print('log', ...messages);
    }
  }

  public warn(...messages: any[]): void {
    if (this.getLevel() <= LoggerLevel.warn) {
      this.print('warn', ...messages);
    }
  }

  public error(...messages: any[]): void {
    if (this.getLevel() <= LoggerLevel.error) {
      this.print('error', ...messages);
    }
  }

  /*
  public group(name?: string): void {
    console.group(name || this.identifier);
  }

  public groupEnd(): void {
    console.groupEnd();
  }

  public time(name?: string): void {
    console.time(name || this.identifier);
  }

  public timeEnd(name?: string): void {
    console.timeEnd(name || this.identifier);
  }
   */

  private print(method: LogMethod, ...messages: any[]): void {
    let pathPrinted = false;

    messages.forEach((message) => {
      if (typeof message === 'string' || typeof message === 'number') {
        console[method](this.getFullPath() + ' : ' + message);
        pathPrinted = true;
      } else {
        if (! pathPrinted) {
          console[method](this.getFullPath() + ' :');
          pathPrinted = true;
        }

        console[method](message);
      }
    });
  }

  private getLevel(): LoggerLevel {
    if (Logger.runtimeLevel != null) {
      return Logger.runtimeLevel;
    }

    if (this.level != null) {
      return this.level;
    }

    if (this.parentLogger != null) {
      return this.parentLogger.getLevel();
    }

    return LoggerLevel.none;
  }

  private getFullPath(): string {
    let paths = [this.identifier];
    let parent = this.parentLogger;

    while (parent != null) {
      paths = [parent.identifier, ...paths];
      parent = parent.parentLogger;
    }

    let fullPath = paths.join('.');

    if (fullPath.length > this.pathLength) {
      fullPath = fullPath.substr(fullPath.length - this.pathLength, this.pathLength);
    } else {
      fullPath = fullPath.padEnd(this.pathLength, ' ');
    }

    return fullPath;
  }
}
