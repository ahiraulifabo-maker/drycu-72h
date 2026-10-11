import type { PrinterCalibration } from '@workspace/api-client-react';

export const DEFAULT_PRINTER_CALIBRATION: PrinterCalibration = {
  tagOffsetXmm: 0,
  tagOffsetYmm: 0,
  billOffsetXmm: 0,
  billOffsetYmm: 0,
};

export function normalizePrinterCalibration(value: unknown): PrinterCalibration {
  const input = value && typeof value === 'object'
    ? value as Partial<PrinterCalibration>
    : {};
  const normalizeOffset = (offset: unknown) => {
    const numeric = typeof offset === 'number' ? offset : Number(offset);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(-10, Math.min(10, numeric));
  };

  return {
    tagOffsetXmm: normalizeOffset(input.tagOffsetXmm),
    tagOffsetYmm: normalizeOffset(input.tagOffsetYmm),
    billOffsetXmm: normalizeOffset(input.billOffsetXmm),
    billOffsetYmm: normalizeOffset(input.billOffsetYmm),
  };
}
