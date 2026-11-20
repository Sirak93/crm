import { readonly, ref } from 'vue';
import { AppLogger } from '../utils/AppLogger';

type ScanListener = (barcode: string) => void;

// USB serial ignores the speed, but the API requires one.
const BAUD_RATE = 9600;

const listeners = new Set<ScanListener>();
const isConnected = ref(false);
let currentPort: SerialPort | null = null;
let isInitialized = false;

/** The scanner ends each barcode with CR (or LF); a read chunk may hold part of one or several. */
const readScans = async (port: SerialPort) => {
  const decoder = new TextDecoder();
  let buffer = '';
  // `readable` turns null once the scanner is unplugged; a read error (e.g. bad bytes) only restarts the reader.
  while (port.readable) {
    const reader = port.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/[\r\n]/);
        buffer = parts.pop() ?? '';
        for (const barcode of parts.map((p) => p.trim()).filter(Boolean)) listeners.forEach((listener) => listener(barcode));
      }
    } catch (error) {
      AppLogger.error('Serial scanner read failed:', error);
    } finally {
      reader.releaseLock();
    }
  }
};

/** Resolves false when the port cannot be opened - most often another tab already holds it. */
const open = async (port: SerialPort): Promise<boolean> => {
  if (currentPort) return true;
  try {
    await port.open({ baudRate: BAUD_RATE });
  } catch (error) {
    AppLogger.error('Could not open the serial scanner:', error);
    return false;
  }
  currentPort = port;
  isConnected.value = true;
  readScans(port).finally(() => {
    currentPort = null;
    isConnected.value = false;
    port.close().catch(() => undefined);
  });
  return true;
};

/** A USB scanner in serial (COM) mode, read through Web Serial (Chrome and Edge only). */
export const SerialScannerService = {
  isSupported: !!navigator.serial,
  isConnected: readonly(isConnected),

  /** Opens a scanner allowed before, now and whenever one is plugged in - no prompt. */
  async init() {
    if (!navigator.serial || isInitialized) return;
    isInitialized = true;
    navigator.serial.addEventListener('connect', (event) => open(event.target as SerialPort));
    const [port] = await navigator.serial.getPorts();
    if (port) await open(port);
  },

  /** The one-time browser prompt; must run from a click. Resolves false if cancelled or the port is busy. */
  async connect(): Promise<boolean> {
    if (!navigator.serial) return false;
    try {
      return await open(await navigator.serial.requestPort());
    } catch {
      // The user closed the prompt without picking a device.
      return false;
    }
  },

  subscribe(listener: ScanListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
