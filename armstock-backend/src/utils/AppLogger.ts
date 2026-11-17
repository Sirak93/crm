const isEnabled = process.env.ENABLE_LOGS === 'true';

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",

  gray: "\x1b[90m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",

  bold: "\x1b[1m",
};

class Logger {
  private prefix: string;
  private isEnabled: boolean;

  constructor(prefix: string = '', isEnabled: boolean = true) {
    this.prefix = prefix;
    this.isEnabled = isEnabled;
  }

  child(name: string): Logger {
    const newPrefix = this.prefix ? `${this.prefix}:[${name}]` : `[${name}]`;
    return new Logger(newPrefix, this.isEnabled);
  }

  private format(level: string, color: string, args: unknown[]) {
    const timestamp = `${colors.gray}${new Date().toISOString()}${colors.reset}`;
    const lvl = `${color}${colors.bold}[${level}]${colors.reset}`;
    const prefix = this.prefix ? `${this.prefix}:` : '';

    return [lvl, timestamp, prefix, ...args];
  }

  log(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.log(...this.format("LOG", colors.gray, args));
  }

  success(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.log(...this.format("LOG", colors.green, args));
  }

  info(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.info(...this.format("INFO", colors.blue, args));
  }

  warn(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.warn(...this.format("WARN", colors.yellow, args));
  }

  error(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.error(...this.format("ERROR", colors.red, args));
  }

  debug(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.debug(...this.format("DEBUG", colors.magenta, args));
  }
}

export const AppLogger = new Logger('[Backend]', isEnabled);
export type { Logger };
