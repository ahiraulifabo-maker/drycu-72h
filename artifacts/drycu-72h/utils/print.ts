import { Platform } from "react-native";

const SERVICE_ABBR: Record<string, string> = {
  "Dry Cleaning": "DC",
  Laundry: "LD",
  Ironing: "IR",
};

export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined") return;
  if (!order || !storeInfo) return;

  try {
    let tagBlocks = "";
    const items = order.items || [];

    items.forEach((item: any) => {
      const service = SERVICE_ABBR[item.serviceType] || item.serviceType || "";
      const totalQty = item.qty || 1;

      for (let i = 1; i <= totalQty; i++) {
        tagBlocks += `
          <div class="tag" style="padding: 6px; margin-bottom: 20px; border-bottom: 3px dashed #000000; text-align: center; page-break-inside: avoid;">
            <div class="store" style="font-weight: 900; color: #000000; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Arial Black', Gadget, sans-serif;">${storeInfo.name || ""}</div>
            <div class="dt" style="font-weight: 900; color: #000000; font-size: 18px; border: 3px solid #000000; display: inline-block; padding: 2px 8px; margin: 6px 0; font-family: 'Arial Black', Gadget, sans-serif;">TAG NO: ${order.id || ""} (${i}/${totalQty})</div>
            <div style="border-top: 2px solid #000000; margin: 5px 0;"></div>
            <div class="garment" style="font-weight: 900; color: #000000; font-size: 17px; text-align: left; font-family: 'Arial Black', sans-serif;">Item: ${item.itemName || ""}</div>
            <div class="service" style="font-weight: 900; color: #000000; font-size: 16px; text-align: left; margin-top: 4px; font-family: 'Arial Black', sans-serif;">Service: ${service}</div>
          </div>
        `;
      }
    });

    const html =
      "<html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } body { font-family: 'Arial Black', Arial, sans-serif; width: 58mm; margin: 0; padding: 3px; color: #000000; -webkit-print-color-adjust: exact; }</style></head><body>" +
      tagBlocks +
      "</body></html>";

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 400);
    }
  } catch (err) {
    console.error("Print error caught:", err);
  }
}

export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined") return;
  if (!order || !storeInfo) return;

  try {
    let itemRows = "";
    const items = order.items || [];
    let totalAmount = 0;

    items.forEach((item: any) => {
      const itemTotal = (item.rate || 0) * (item.qty || 1);
      totalAmount += itemTotal;
      itemRows += `
        <tr>
          <td style="padding: 5px 0;">${item.itemName || ""} (${item.qty || 1})</td>
          <td style="text-align: right; padding: 5px 0;">Rupees ${itemTotal}</td>
        </tr>
      `;
    });

    const html =
      "<html><head><title>Invoice</title><style>@page { size: 58mm auto; margin: 0; } body { font-family: monospace; width: 58mm; margin: 0; padding: 10px; font-size: 12px; } .center { text-align: center; } .bold { font-weight: bold; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } .border-top { border-top: 1px dashed #000; } </style></head><body><div class='center bold' style='font-size: 16px;'>" +
      (storeInfo.name || "DRYCU-72H") +
      "</div><div class='center'>" +
      (storeInfo.address || "") +
      "</div><div class='center'>Mob: " +
      (storeInfo.phone || "") +
      "</div><div class='border-top' style='margin-top: 5px;'></div><p><b>Order ID:</b> " +
      (order.id || "") +
      "<br><b>Date:</b> " +
      new Date().toLocaleDateString() +
      "</p><div class='border-top'></div><table><thead><tr class='bold'><th style='text-align: left;'>Item (Qty)</th><th style='text-align: right;'>Amt</th></tr></thead><tbody>" +
      itemRows +
      "</tbody></table><div class='border-top' style='margin-top: 5px;'></div><p class='bold' style='text-align: right; font-size: 14px;'>Total: Rupees " +
      totalAmount +
      "</p><div class='center' style='margin-top: 15px;'>Thank You! Visit Again.</div></body></html>";

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 400);
    }
  } catch (err) {
    console.error("Bill print error caught:", err);
  }
}

export function sendWhatsAppNotification(
  order: any,
  customerPhone: string,
  encodedMessage: string,
) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const whatsappUrl =
      "https://web.whatsapp.com/send?phone=" +
      customerPhone +
      "&text=" +
      encodedMessage;
    window.open(whatsappUrl, "_blank");
  } catch (err) {
    console.error("WhatsApp error caught:", err);
  }
}
