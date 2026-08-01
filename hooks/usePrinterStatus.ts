// hooks/usePrinterStatus.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  printer,
  isBluetoothSupported,
  setBluetoothPrinterPreference,
} from "@/lib/utils/bluetooth-printer";

export function usePrinterStatus() {
  // Starts false on both server and the first client render (avoids a
  // hydration mismatch, since `navigator.bluetooth` only exists in the
  // browser) — flipped to the real value by the effect below, after mount.
  const [supported,   setSupported]   = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName,  setDeviceName]  = useState<string | null>(null);
  const [connecting,  setConnecting]  = useState(false);

  useEffect(() => {
    setSupported(isBluetoothSupported());

    const sync = () => {
      setIsConnected(printer.isConnected);
      setDeviceName(printer.deviceName);
    };
    sync();
    return printer.subscribe(sync);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await printer.connect();
      // Connecting from the header means this device intends to print through
      // the thermal printer, including from the new-order success screen.
      setBluetoothPrinterPreference(true);
      return true;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await printer.disconnect();
  }, []);

  return {
    supported,
    isConnected,
    deviceName,
    connecting,
    connect,
    disconnect,
  };
}
