import { Logger, LoggerLevel } from '../../src/utils/Logger';

describe('Logger', () => {
  beforeEach(() => {
    Logger.runtimeLevel = null;
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  test('prints messages based on own level', () => {
    const logger = new Logger('logger', null, LoggerLevel.all);

    logger.info('info');
    logger.debug('debug');
    expect(console.log).toHaveBeenCalledTimes(2);

    logger.warn('warn');
    expect(console.warn).toHaveBeenCalledTimes(1);

    logger.error('error');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  test('prints non-literal on a separate line', () => {
    const logger = new Logger('logger', null, LoggerLevel.all);
    logger.info({ foo: 'bar' });

    expect(console.log).toHaveBeenCalledTimes(2);
  });

  test('prints multiple messages on different lines', () => {
    const logger = new Logger('logger', null, LoggerLevel.all);
    const fn = () => {};
    logger.info('hey', fn, {});

    expect(console.log).toHaveBeenCalledTimes(3);
  });

  test('prints the composed path', () => {
    const a = new Logger('a', null, LoggerLevel.all);
    const b = new Logger('b', a);
    const c = new Logger('c', b);
    const d = new Logger('d', c);

    d.error('error');

    expect(console.error).toHaveBeenCalledWith('a.b.c.d'.padEnd(a.pathLength) + ' : error');
  });

  test('show all messages on "all" level', () => {
    const logger = new Logger('a', null, LoggerLevel.all);
    logAll(logger);

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  test('show messages for "info" level or above', () => {
    const logger = new Logger('a', null, LoggerLevel.info);
    logAll(logger);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  test('show messages for "debug" level or above', () => {
    const logger = new Logger('a', null, LoggerLevel.debug);
    logAll(logger);

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  test('show messages for "warn" level or above', () => {
    const logger = new Logger('a', null, LoggerLevel.warn);
    logAll(logger);

    expect(console.log).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  test('show messages for "error" level or above', () => {
    const logger = new Logger('a', null, LoggerLevel.error);
    logAll(logger);

    expect(console.log).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  test('show messages no messages', () => {
    const logger = new Logger('a', null, LoggerLevel.none);
    logAll(logger);

    expect(console.log).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(0);
  });

  test('uses static runtime level when provided', () => {
    const logger = new Logger('logger', null, LoggerLevel.all);

    logger.info('info');
    expect(console.log).toHaveBeenCalledTimes(1);

    Logger.runtimeLevel = LoggerLevel.none;
    logger.info('info');
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('uses "none" as default level when none is provided', () => {
    const logger = new Logger('');
    logAll(logger);
    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('keep only end of composed path if too long', () => {
    const logger = new Logger(Array(99).fill('_').join('') + 'a', null, LoggerLevel.info);

    logger.info('msg');

    const expectedPath = Array(logger.pathLength - 1).fill('_').join('') + 'a';
    expect(console.log).toHaveBeenCalledWith(expectedPath + ' : msg');

  });

  function logAll(logger: Logger): void {
    logger.info('');
    logger.debug('');
    logger.warn('');
    logger.error('');
  }
});
