// lib/utils/bluetooth-printer.ts
/// <reference types="@types/web-bluetooth" />

const ESC = 0x1b;
const GS  = 0x1d;

export const ESC_POS = {
  INIT:          [ESC, 0x40],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_SIZE:   [ESC, 0x21, 0x00],
  LARGE_SIZE:    [ESC, 0x21, 0x30], // double width + double height
  CUT_PAPER:     [GS,  0x56, 0x42, 0x00],
  LINE_FEED:     [0x0a],
  DASHED_LINE:   "--------------------------------\n",
};

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

type PrinterListener = () => void;

export class BluetoothThermalPrinter {
  private device:         BluetoothDevice | null                    = null;
  private server:         BluetoothRemoteGATTServer | null          = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null  = null;
  private listeners       = new Set<PrinterListener>();

  private readonly SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
  private readonly CHAR_UUID    = "00002af1-0000-1000-8000-00805f9b34fb";

  /** Subscribe to connection-state changes (connect/disconnect). Returns an unsubscribe fn. */
  subscribe(listener: PrinterListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  async connect(): Promise<void> {
    if (!isBluetoothSupported()) {
      throw new Error("Web Bluetooth is not supported on this browser/device.");
    }

    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [this.SERVICE_UUID],
    });

    // Reflect disconnects that happen outside our control (printer turned off, out of range, etc.)
    this.device.addEventListener("gattserverdisconnected", () => {
      this.server         = null;
      this.characteristic = null;
      this.notify();
    });

    this.server = await this.device.gatt!.connect();
    const service = await this.server.getPrimaryService(this.SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(this.CHAR_UUID);
    this.notify();
  }

  async disconnect(): Promise<void> {
    this.server?.disconnect();
    this.device         = null;
    this.server         = null;
    this.characteristic = null;
    this.notify();
  }

  get isConnected(): boolean {
    return this.server?.connected ?? false;
  }

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error("Printer not connected.");

    // Cheap BLE thermal printers commonly expose a 20-byte GATT write payload.
    // A larger write can resolve successfully in Web Bluetooth while the printer
    // silently keeps only the first part (or overruns its very small input
    // buffer), which produces a receipt that stops after the header. Keep writes
    // at the universally-safe BLE payload size and pace them so long receipts are
    // delivered completely.
    const CHUNK = 20;
    const WRITE_DELAY_MS = 20;

    for (let i = 0; i < data.length; i += CHUNK) {
      await this.characteristic.writeValueWithoutResponse(data.slice(i, i + CHUNK));
      await delay(WRITE_DELAY_MS);
    }

    // Let the printer drain its receive buffer before the caller reports success
    // (and before a subsequent print can start).
    await delay(100);
  }

  async printText(text: string): Promise<void> {
    await this.write(new TextEncoder().encode(text));
  }

  async printBytes(bytes: number[]): Promise<void> {
    await this.write(new Uint8Array(bytes));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const printer = new BluetoothThermalPrinter();
