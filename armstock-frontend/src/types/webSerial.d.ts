// TypeScript's DOM lib has no Web Serial types yet; only the members we use.
interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial extends EventTarget {
  getPorts(): Promise<SerialPort[]>;
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  /** Chrome and Edge only. */
  readonly serial?: Serial;
}
