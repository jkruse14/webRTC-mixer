export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export default class Logger {
  private static log(level: LogLevel, message): void {
    if ([LogLevel.INFO, LogLevel.WARN].includes(level)) {
      console[level](`> > > > ${ Date.now() } - ${message} < < < <`);
    } else {
      console[level](message);
    }
  }

  public static info(message: string): void {
    Logger.log(LogLevel.INFO, message);
  }

  public static warn(message: string): void {
    Logger.log(LogLevel.WARN, message);
  }

  public static error(message: string): void {
    Logger.log(LogLevel.ERROR, message);
  }
}
