// lib/utils/bluetooth-printer.ts

const ESC = 0x1b;
const GS  = 0x1d;

export const ESC_POS = {
  INIT:           [ESC, 0x40],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],
  NORMAL_SIZE:    [ESC, 0x21, 0x00],
  CUT_PAPER:      [GS,  0x56, 0x42, 0x00],
  LINE_FEED:      [0x0a],
  DASHED_LINE:    "--------------------------------\n",
};

export class BluetoothThermalPrinter {
  private device:      BluetoothDevice | null      = null;
  private server:      BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // Common UUIDs for ESC/POS BLE printers
  private readonly SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
  private readonly CHAR_UUID    = "00002af1-0000-1000-8000-00805f9b34fb";

  async connect(): Promise<void> {
    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [this.SERVICE_UUID],
    });

    this.server = await this.device.gatt!.connect();
    const service = await this.server.getPrimaryService(this.SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(this.CHAR_UUID);
  }

  async disconnect(): Promise<void> {
    this.server?.disconnect();
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  get isConnected(): boolean {
    return this.server?.connected ?? false;
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error("Printer not connected");
    
    // Chunk data — BLE has a max packet size (~512 bytes)
    const CHUNK = 512;
    for (let i = 0; i < data.length; i += CHUNK) {
      await this.characteristic.writeValueWithoutResponse(
        data.slice(i, i + CHUNK)
      );
    }
  }

  async printText(text: string): Promise<void> {
    const encoder = new TextEncoder();
    await this.write(encoder.encode(text));
  }

  async printBytes(bytes: number[]): Promise<void> {
    await this.write(new Uint8Array(bytes));
  }
}

export const printer = new BluetoothThermalPrinter();