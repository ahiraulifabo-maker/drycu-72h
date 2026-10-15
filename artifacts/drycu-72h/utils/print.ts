import { Alert, Image, Platform } from "react-native";
import * as Print from "expo-print";
import {
  DEFAULT_PRINTER_CALIBRATION,
  normalizePrinterCalibration,
} from "@/constants/printerCalibration";
import type { PrinterCalibration } from "@workspace/api-client-react";

const SERVICE_ABBR: Record<string, string> = {
  "dry cleaning": "DC",
  "dry clean": "DC",
  dc: "DC",
  laundry: "LAU",
  "laundry service": "LAU",
  lau: "LAU",
  ld: "LAU",
  "simple press": "SP",
  "simple ironing": "SP",
  sp: "SP",
  "steam press": "STP",
  "steam ironing": "STP",
  stp: "STP",
  ironing: "IR",
  iron: "IR",
  ir: "IR",
  "top up": "TP",
  topup: "TP",
  tp: "TP",
};

const SERVICE_NAMES: Record<string, string> = {
  DC: "DRY CLEANING",
  LAU: "LAUNDRY",
  SP: "SIMPLE PRESS",
  STP: "STEAM PRESS",
  IR: "IRONING",
  TP: "TOP-UP",
};

function getServiceCode(item: any): string {
  const rawService =
    item?.serviceType ??
    item?.service ??
    item?.serviceName ??
    item?.serviceLabel ??
    item?.service_type ??
    item?.service_name ??
    item?.type ??
    item?.category ??
    item?.name ??
    (typeof item === "string" ? item : "");

  const normalized = String(rawService)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  return (
    SERVICE_ABBR[normalized] ??
    (normalized ? String(rawService).trim().toUpperCase() : "SERVICE")
  );
}

function getServiceName(item: any): string {
  const code = getServiceCode(item);
  return SERVICE_NAMES[code] ?? code;
}

function getOrderNumber(order: any): string {
  const raw = String(
    order?.id ?? order?.orderNumber ?? order?.diNumber ?? "",
  ).trim();
  if (!raw)
    throw new Error(
      "This order has no saved order number; printing was stopped to avoid a false bill or tag.",
    );
  if (/^DI-\d+$/i.test(raw)) return raw.toUpperCase();
  if (/^\d+$/.test(raw)) return `DI-${raw.padStart(5, "0")}`;
  return raw;
}

function estimateTagRollHeightMm(
  items: Array<{ name: string; qty: number }>,
  customerName: string,
): number {
  const customerLines = Math.max(1, Math.ceil(customerName.length / 24));
  const height = items.reduce((total, item) => {
    const itemLines = Math.max(1, Math.ceil(item.name.length / 24));
    const oneTagHeight = 35 + (customerLines - 1) * 4 + (itemLines - 1) * 4;
    return total + Math.max(0, item.qty) * (oneTagHeight + 3);
  }, 0);
  return Math.max(45, Math.ceil(height + 6));
}

function estimateBillRollHeightMm(itemCount: number): number {
  return Math.max(260, Math.min(700, 230 + itemCount * 12));
}

const PRINT_POINTS_PER_MM = 72 / 25.4;
const TAG_WIDTH_MM = 38.1;
const BILL_WIDTH_MM = 80;

function getOffsetTransform(
  kind: "tag" | "bill",
  value: PrinterCalibration,
): string {
  const calibration = normalizePrinterCalibration(value);
  const x =
    kind === "tag" ? calibration.tagOffsetXmm : calibration.billOffsetXmm;
  const y =
    kind === "tag" ? calibration.tagOffsetYmm : calibration.billOffsetYmm;
  return `translate(${x}mm, ${y}mm)`;
}

async function dispatchPrint(
  html: string,
  widthMm: number,
  heightMm: number,
  isWeb: boolean,
): Promise<boolean> {
  if (isWeb) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      // Some desktop browsers block pop-ups from an embedded app preview.
      // Print from a hidden same-origin frame instead of silently failing.
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.position = "fixed";
      frame.style.width = "1px";
      frame.style.height = "1px";
      frame.style.left = "-10000px";
      frame.style.bottom = "0";
      frame.style.border = "0";
      frame.onload = () => {
        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          frame.remove();
          window.alert(
            "The browser could not open the print dialog. Try allowing printing for this site.",
          );
          return;
        }
        const cleanup = () => window.setTimeout(() => frame.remove(), 500);
        frameWindow.addEventListener("afterprint", cleanup, { once: true });
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(cleanup, 60000);
      };
      frame.srcdoc = html;
      document.body.appendChild(frame);
      return true;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
    return true;
  }

  await Print.printAsync({
    html,
    width: Math.round(widthMm * PRINT_POINTS_PER_MM),
    height: Math.round(heightMm * PRINT_POINTS_PER_MM),
    orientation: Print.Orientation.portrait,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  return true;
}

const DRYCU_LOGO_ASSET = require("../assets/images/drycu-logo.jpeg");

function getLogoUri(): string {
  try {
    return Image.resolveAssetSource(DRYCU_LOGO_ASSET)?.uri ?? "";
  } catch {
    return "";
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function printTags(
  order: any,
  storeInfo: any,
  printerCalibration: PrinterCalibration = DEFAULT_PRINTER_CALIBRATION,
): Promise<void> {
  const isWeb = Platform.OS === "web" && typeof window !== "undefined";

  try {
    const orderNumber = getOrderNumber(order);
    const customerName = String(
      order?.customerName ?? order?.name ?? "Customer",
    );
    const stateItems = Array.isArray(order?.items) ? order.items : [];
    if (stateItems.length === 0) {
      throw new Error(
        "This order has no saved garment items, so no tags were printed.",
      );
    }

    const detectedItems: Array<{ name: string; service: string; qty: number }> =
      stateItems.map((item: any) => {
        const service = getServiceName(item);
        if (!service || service === "SERVICE?") {
          throw new Error(
            `Service is missing for ${item?.itemName || "a garment"}. Recreate the order with a service selected.`,
          );
        }
        const qty = Math.max(
          1,
          Math.floor(Number(item?.qty ?? item?.quantity ?? 1)),
        );
        return {
          name: String(item?.itemName ?? item?.name ?? "Garment"),
          service,
          qty: Number.isFinite(qty) ? qty : 1,
        };
      });

    const totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);
    const tagRollHeightMm = estimateTagRollHeightMm(
      detectedItems,
      customerName,
    );
    const bookedDateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
    const readyDateStr = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });

    let tagsHtml = "";
    let currentPieceIndex = 1;

    detectedItems.forEach((item) => {
      for (let i = 0; i < item.qty; i++) {
        tagsHtml += `
          <div class="tag-wrapper">
            <div class="brand">DRYCU-72H</div>
            <div class="order-id">${escapeHtml(orderNumber)}</div>
            <div class="cust-title">${escapeHtml(customerName)}</div>
            <div class="svc-row">
            <span class="svc-code">${escapeHtml(item.service)}</span>
              <span class="counter-ratio">${currentPieceIndex}/${totalPcs}</span>
            </div>
            <div class="info-row">Ready: ${readyDateStr}</div>
            <div class="info-row">Item: ${escapeHtml(item.name)}</div>
            <div class="info-row">Booked: ${bookedDateStr}</div>
            <div class="dashed-separator">-------------------------</div>
          </div>
        `;
        currentPieceIndex++;
      }
    });

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Tags</title>
        <style>
          @page { size: 38.1mm ${tagRollHeightMm}mm; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          html, body { writing-mode: horizontal-tb; }
          html { width: 100%; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 36mm; margin: 0 auto; padding: 3px 2px; background-color: #fff; transform: ${getOffsetTransform("tag", printerCalibration)}; transform-origin: top center; }
          .tag-wrapper { width: 100%; text-align: left; padding: 2px 0; page-break-inside: avoid; display: block; }
          .brand { font-size: 11px; text-align: center; margin-bottom: 3px; }
          .order-id { font-size: 17px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; }
          .cust-title { font-size: 11px; font-weight: 900; line-height: 1.2; margin-bottom: 3px; overflow-wrap: anywhere; }
          .svc-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; margin-bottom: 3px; width: 100%; }
          .svc-code { text-transform: uppercase; }
          .info-row { font-size: 10px; font-weight: 900; line-height: 1.25; margin-bottom: 1px; overflow-wrap: anywhere; }
          .dashed-separator { font-size: 9px; font-weight: 900; white-space: nowrap; margin-top: 4px; margin-bottom: 5px; overflow: hidden; }
        </style>
      </head>
      <body>${tagsHtml}</body>
      </html>
    `;

    await dispatchPrint(html, TAG_WIDTH_MM, tagRollHeightMm, isWeb);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error
        ? err.message
        : "The device could not open its print service. Check that a printer or system print service is available.";
    if (isWeb) window.alert(`Printing unavailable\n\n${message}`);
    else Alert.alert("Printing unavailable", message);
  }
}

export async function printBill(
  order: any,
  customer: any,
  storeInfo: any,
  printerCalibration: PrinterCalibration = DEFAULT_PRINTER_CALIBRATION,
): Promise<void> {
  const isWeb = Platform.OS === "web" && typeof window !== "undefined";

  try {
    const orderNumber = getOrderNumber(order);
    const customerName = String(
      customer?.name ?? order?.customerName ?? order?.name ?? "Customer",
    );
    const customerPhone = String(
      customer?.mobile ??
        customer?.phone ??
        order?.customerPhone ??
        order?.phone ??
        "",
    );
    const customerAddress = String(
      customer?.address ?? order?.customerAddress ?? "",
    );
    const stateItems = Array.isArray(order?.items) ? order.items : [];
    const detectedItems: Array<{
      name: string;
      service: string;
      qty: number;
      kg: number;
      price: number;
    }> = [];

    stateItems.forEach((item: any) => {
      const qty = Math.max(
        1,
        Math.floor(Number(item?.qty ?? item?.quantity ?? 1)),
      );
      const service = getServiceCode(item);
      if (service === "SERVICE?") {
        throw new Error(
          `Service is missing for ${item?.itemName || "a garment"}. Recreate the order with a service selected.`,
        );
      }
      const unitPrice = Number(
        item?.price ??
          item?.rate ??
          item?.ratePerUnit ??
          item?.customPrice ??
          0,
      );
      detectedItems.push({
        name: String(item?.itemName ?? item?.name ?? "Garment"),
        service,
        qty: Number.isFinite(qty) ? qty : 1,
        kg: Number(item?.kg ?? 0),
        price: Number(item?.subtotal ?? unitPrice * qty),
      });
    });

    if (Array.isArray(order?.topUps)) {
      order.topUps
        .filter((topUp: any) => Number(topUp.qty) > 0)
        .forEach((topUp: any) => {
          detectedItems.push({
            name: topUp.name || "Top-Up Service",
            service: "TP",
            qty: Number(topUp.qty),
            kg: 0,
            price: Number(
              topUp.subtotal ?? Number(topUp.rate || 0) * Number(topUp.qty),
            ),
          });
        });
    }

    if (detectedItems.length === 0) {
      throw new Error("This order has no saved items to print.");
    }

    let grossAmount = Number(
      order?.grossAmount ??
        detectedItems.reduce((acc, curr) => acc + curr.price, 0),
    );
    let discountAmount = Number(order?.discountAmount ?? 0);
    let netPayable = Number(order?.netPayable ?? grossAmount - discountAmount);
    let advance = Number(order?.advancePaid ?? order?.advanceAmount ?? 0);
    let balance = netPayable - advance;
    let totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);
    let totalKg = detectedItems.reduce((acc, curr) => acc + curr.kg, 0);
    const billRollHeightMm = estimateBillRollHeightMm(detectedItems.length);

    let rowsHtml = "";
    detectedItems.forEach((item) => {
      rowsHtml += `
        <tr style="vertical-align: top;">
          <td style="padding: 3px 0; font-size: 10px;">${item.kg > 0 ? item.kg.toFixed(3) : "-"}</td>
          <td style="padding: 3px 0; font-size: 10px;">${item.qty > 0 ? item.qty : "-"}</td>
          <td style="padding: 3px 0; font-size: 10px;">${escapeHtml(item.service)}</td>
          <td style="padding: 3px 0; text-align: right; font-size: 10px;">₹${item.price.toFixed(2)}</td>
        </tr>
      `;
    });

    const logoUri = getLogoUri();
    const formattedDate = new Date(
      order?.createdAt || Date.now(),
    ).toLocaleDateString("en-GB");
    const readyDate = new Date(
      order?.pickupDeadline || Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-GB");
    const store = storeInfo || {};
    const logoHtml = logoUri
      ? `<img class="store-logo" src="${escapeHtml(logoUri)}" alt="DRYCU-72H logo">`
      : "";

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Invoice</title>
        <style>
          @page { size: 80mm ${billRollHeightMm}mm; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          html, body { writing-mode: horizontal-tb; }
          html { width: 100%; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 74mm; margin: 0 auto; padding: 5px 4px; font-size: 11px; line-height: 1.25; background-color: #fff; color: #000; transform: ${getOffsetTransform("bill", printerCalibration)}; transform-origin: top center; }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .line { border-top: 2px solid #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 3px; }
          td { color: #000; font-weight: 900; }
          .store-header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
          .store-logo { width: 27mm; height: 27mm; object-fit: contain; display: block; margin: 0 auto 3px; }
          .store-name { font-size: 17px; letter-spacing: 0.7px; }
          .store-address { font-size: 10px; line-height: 1.25; }
          .store-contact { font-size: 10px; }
          .tagline { font-size: 9px; margin-top: 2px; font-weight: 900; }
          .order-card { border: 2px solid #000; padding: 4px; margin: 5px 0; }
          .order-card div { margin-bottom: 2px; }
          .section-title { border-bottom: 2px solid #000; padding: 2px 0; margin-top: 5px; font-size: 11px; letter-spacing: 0.6px; }
          .tc-section { font-size: 10px; text-align: left; margin-top: 4px; line-height: 1.3; font-weight: 900; }
          .summary-box { border: 2px solid #000; padding: 4px; margin-top: 5px; }
          .summary-table td { padding: 2px 0; }
          .balance-row td { border-top: 2px solid #000; padding-top: 4px; font-size: 14px; }
          .items-table { border-top: 2px solid #000; border-bottom: 2px solid #000; }
          .items-table th { border-bottom: 2px solid #000; padding: 3px 0; font-size: 10px; text-align: left; }
          .items-table th:last-child, .items-table td:last-child { text-align: right; }
        </style>
      </head>
      <body>
        <div class="store-header">
          ${logoHtml}
          <div class="center bold store-name">${escapeHtml(store.name || "DRYCU-72H")}</div>
          <div class="center store-address">${escapeHtml(store.line1 || "")}<br>${escapeHtml(store.line2 || "")}</div>
          <div class="center store-contact">Contact: ${escapeHtml(store.contact || "")}</div>
          <div class="center tagline">${escapeHtml(store.tagline || "Clean. Fast. You.")}</div>
        </div>
        <div class="order-card">
          <div class="bold" style="font-size: 15px;">${escapeHtml(orderNumber)}</div>
          <div style="font-size: 11px;"><b>Customer:</b> ${escapeHtml(customerName)}</div>
          <div style="font-size: 11px;"><b>Mobile:</b> ${escapeHtml(customerPhone)}</div>
          ${customerAddress ? `<div style="font-size: 10px;"><b>Address:</b> ${escapeHtml(customerAddress)}</div>` : ""}
          <div style="font-size: 10px;"><b>Place of Supply:</b> ${escapeHtml(store.placeOfSupply || "")}</div>
          <div style="font-size: 10.5px;"><b>DATE:</b> ${formattedDate} | <b>RDY:</b> ${readyDate}</div>
        </div>
        <div class="section-title">ITEM DETAILS</div>
        <table class="items-table"><thead><tr><th>KG</th><th>Qty</th><th>Service</th><th>INR</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        <div class="summary-box">
          <table class="summary-table" style="font-size: 11px;">
             <tr><td>T.KG</td><td style="text-align: right;">${totalKg.toFixed(3)}</td></tr>
             <tr><td>TOTAL PCS</td><td style="text-align: right;">${totalPcs} Pcs</td></tr>
             <tr><td>GROSS AMT</td><td style="text-align: right;">₹${grossAmount.toFixed(2)}</td></tr>
              ${discountAmount > 0 ? `<tr><td>DISCOUNT</td><td style="text-align: right;">-₹${discountAmount.toFixed(2)}</td></tr>` : ""}
             <tr><td>ADV PAID</td><td style="text-align: right;">₹${advance.toFixed(2)}</td></tr>
             <tr class="balance-row">
                <td>BAL. AMT.</td>
               <td style="text-align: right;">₹${balance.toFixed(2)}</td>
             </tr>
           </table>
        </div>
        <div class="line"></div>
        <div class="section-title center">TERMS & CONDITIONS</div>
        <div class="tc-section">
          • Not liable for color fastness, threads-out, or missing buttons (❁´◡`❁).<br>
          • Report damage or mixed clothes within 24 hours of delivery.<br>
          • Complete legal Terms and Conditions on our site/app.<br>
          • Unforeseen logistics delays will be notified proactively.<br>
          • No store liability for damage due to sudden fire or burglary.<br>
          • Store not responsible for garments left over 15 days.
        </div>
        <div class="line"></div>
        <div class="center bold" style="font-size: 10px; margin-top: 4px; margin-bottom: 4px;">😊 THANK YOU 😊 VISIT AGAIN 😊 </div>
        <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 9.5px;">
          <span style="border-top: 1.5px solid #000; width: 45%; text-align: center; padding-top: 2px;">CUSTOMER</span>
          <span style="border-top: 1.5px solid #000; width: 45%; text-align: center; padding-top: 2px;">SIGNATURE</span>
        </div>
      </body>
    </html>`;

    await dispatchPrint(html, BILL_WIDTH_MM, billRollHeightMm, isWeb);
  } catch (err) {
    console.error("Failed to print bill:", err);
    const message =
      err instanceof Error
        ? err.message
        : "The device could not open its print service. Check that a printer or system print service is available.";
    if (isWeb) window.alert(`Printing unavailable\n\n${message}`);
    else Alert.alert("Printing unavailable", message);
  }
}

export async function printCalibrationTest(
  kind: "tag" | "bill",
  printerCalibration: PrinterCalibration = DEFAULT_PRINTER_CALIBRATION,
): Promise<void> {
  const isWeb = Platform.OS === "web" && typeof window !== "undefined";
  const widthMm = kind === "tag" ? TAG_WIDTH_MM : BILL_WIDTH_MM;
  const contentWidthMm = kind === "tag" ? 36 : 74;
  const heightMm = kind === "tag" ? 60 : 90;
  const transform = getOffsetTransform(kind, printerCalibration);
  const html = `
    <!doctype html>
    <html><head><meta charset="utf-8"><title>${kind === "tag" ? "Tag" : "Bill"} calibration test</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; writing-mode: horizontal-tb; }
      body { position: relative; width: ${contentWidthMm}mm; height: ${heightMm}mm; margin: 0 auto; padding: 2mm; font: 8pt Arial, sans-serif; color: #000; background: #fff; transform: ${transform}; transform-origin: top center; }
      .frame { position: absolute; inset: 2mm; border: 0.25mm solid #000; }
      .vertical { position: absolute; left: 50%; top: 2mm; bottom: 2mm; border-left: 0.2mm dashed #000; }
      .horizontal { position: absolute; top: 50%; left: 2mm; right: 2mm; border-top: 0.2mm dashed #000; }
      .target { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 16pt; font-weight: bold; }
      .heading { position: absolute; top: 6mm; left: 4mm; right: 4mm; text-align: center; font-weight: bold; }
      .footer { position: absolute; bottom: 6mm; left: 4mm; right: 4mm; text-align: center; }
    </style></head>
    <body>
      <div class="frame"></div><div class="vertical"></div><div class="horizontal"></div>
      <div class="target">+</div>
      <div class="heading">${kind === "tag" ? "TAG 38.1 mm" : "BILL 80 mm"} · ALIGNMENT TEST</div>
      <div class="footer">Solid border = printable area · Dashed lines = center</div>
    </body></html>
  `;

  try {
    await dispatchPrint(html, widthMm, heightMm, isWeb);
  } catch (error) {
    console.error("Failed to print calibration test:", error);
    const message =
      "The device could not open its print service. Check that a printer or system print service is available.";
    if (isWeb) window.alert(`Printing unavailable\n\n${message}`);
    else Alert.alert("Printing unavailable", message);
  }
}
