const isEnabled = import.meta.env.VITE_ENABLE_LOGS === 'true';

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

  private getStyle(level: string): string {
    switch (level) {
      case "INFO":
        return "color: #06b6d4; font-weight: bold";
      case "WARN":
        return "color: orange; font-weight: bold";
      case "ERROR":
        return "color: red; font-weight: bold";
      case "DEBUG":
        return "color: purple; font-weight: bold";
      case "SUCCESS":
        return "color: green; font-weight: bold";
      default:
        return "color: gray; font-weight: bold";
    }
  }

  private format(level: string, args: unknown[]) {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `${this.prefix}:` : '';

    return [
      `%c[${level}] ${timestamp} ${prefix}`,
      this.getStyle(level),
      ...args,
    ];
  }

  log(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.log(...this.format("LOG", args));
  }

  success(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.log(...this.format("SUCCESS", args));
  }

  info(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.info(...this.format("INFO", args));
  }

  warn(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.warn(...this.format("WARN", args));
  }

  error(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.error(...this.format("ERROR", args));
  }

  debug(...args: unknown[]) {
    if (!this.isEnabled) return;
    console.debug(...this.format("DEBUG", args));
  }
}

export const AppLogger = new Logger('[Frontend]', isEnabled);
export type { Logger };
