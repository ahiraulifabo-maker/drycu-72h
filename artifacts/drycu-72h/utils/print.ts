import { Platform } from "react-native";

const SERVICE_ABBR: Record<string, string> = {
  "Dry Cleaning": "DC",
  Laundry: "LD",
  Ironing: "IR",
};

// ==========================================
// 1. COMPACT CLOTH TAGS
// ==========================================
export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let tagBlocks = "";
    const items = order.items || order.garments || order.orderItems || [];

    const orderIdStr = String(order.id || order.orderNumber || "").replace(
      /^[A-Za-z-]+/,
      "",
    );
    const formattedId = "DI-" + orderIdStr.padStart(5, "0");

    const customerName =
      order.customerName ||
      order.customer?.name ||
      order.customer?.customerName ||
      order.customer?.fullName ||
      "Customer";
    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "";
    const readyDateRaw =
      order.readyDate || order.pickupDeadline || order.deliveryDate || "";
    const formattedReadyDate = readyDateRaw
      ? new Date(readyDateRaw).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "TBD";

    items.forEach((item: any) => {
      const service =
        SERVICE_ABBR[item.serviceType || item.service] ||
        item.serviceType ||
        item.service ||
        "DC";
      const totalQty = item.qty || item.quantity || 1;

      for (let i = 1; i <= totalQty; i++) {
        tagBlocks += `
          <div style="width: 50mm; padding: 2px; margin-bottom: 8px; border-bottom: 1px dashed #000; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important; page-break-inside: avoid;">
            <div style="font-size: 16px; font-weight: 900; text-align: left;">${formattedId}</div>
            <div style="font-size: 13px; font-weight: 900; margin-top: 1px;">${customerName}</div>
            <div style="margin: 2px 0; font-size: 12px; font-weight: 900;">
              <span>${service}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span>${i}/${totalQty}</span>
            </div>
            <div style="font-size: 11px; line-height: 1.1; font-weight: 900;">
              Ready: ${formattedReadyDate}<br>
              Item: ${item.itemName || item.name || "Garment"}<br>
              Booked: ${orderDate}
            </div>
          </div>
        `;
      }
    });

    const html =
      "<html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } * { font-weight: 900 !important; color: #000 !important; } body { margin: 0; padding: 2px; }</style></head><body>" +
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
    console.error("Tags print failed:", err);
  }
}

// ==========================================
// 2. CONCISE & ULTRA SHORT EXTRA BOLD BILL
// ==========================================
export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let itemRows = "";
    const items = order.items || order.garments || order.orderItems || [];
    let totalPcs = 0;
    let grossAmount = 0;

    // Direct global price map handling fallbacks
    const globalTotal =
      order.totalAmount ||
      order.grossAmount ||
      order.netPayable ||
      order.financials?.grossAmount ||
      0;

    items.forEach((item: any) => {
      const qty = item.qty || item.quantity || 1;

      // Calculate unit rate with global context fallbacks if individual items are zeroed out
      let unitRate = item.price ?? item.rate ?? item.amount ?? item.cost ?? 0;
      if (
        unitRate === 0 &&
        globalTotal > 0 &&
        items.length > 0 &&
        grossAmount === 0
      ) {
        unitRate = globalTotal / items.length;
      }

      const itemTotal = unitRate * qty;
      totalPcs += qty;
      grossAmount += itemTotal;

      const serviceAbbr =
        SERVICE_ABBR[item.serviceType || item.service] ||
        item.serviceType ||
        item.service ||
        "DC";

      itemRows += `
        <tr style="vertical-align: top;">
          <td style="padding: 3px 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900;">
            • ${item.itemName || item.name || "Garment"} [${serviceAbbr}] x ${qty}
          </td>
          <td style="padding: 3px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900;">
            ₹${itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    });

    if (grossAmount === 0 || Math.abs(grossAmount - globalTotal) > 1) {
      grossAmount = globalTotal;
    }
    if (totalPcs === 0) {
      totalPcs =
        order.totalQty ||
        order.totalQuantity ||
        order.totalPcs ||
        items.length ||
        1;
    }

    const advance =
      order.advanceAmount || order.advancePaid || order.advance || 0;
    const balance = grossAmount - advance;

    const customerName =
      order.customerName ||
      order.customer?.name ||
      order.customer?.customerName ||
      order.customer?.fullName ||
      "Customer";
    const customerPhone =
      order.customerPhone ||
      order.customer?.phone ||
      order.customer?.mobile ||
      "N/A";

    const orderIdStr = String(order.id || order.orderNumber || "").replace(
      /^[A-Za-z-]+/,
      "",
    );
    const formattedOrderId = "DI-" + orderIdStr.padStart(5, "0");

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-GB")
      : new Date().toLocaleDateString("en-GB");

    const readyDateRaw =
      order.readyDate || order.pickupDeadline || order.deliveryDate || "TBD";
    const readyDate =
      readyDateRaw && readyDateRaw !== "TBD"
        ? new Date(readyDateRaw).toLocaleDateString("en-GB")
        : "TBD";

    const html = `
      <html>
      <head>
        <title>Short Premium Bill</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 54mm; 
            padding: 4px; 
            font-size: 11px; 
            line-height: 1.2;
            background-color: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 2px; }
          td { color: #000; font-weight: 900; }
          .tc-block {
            font-size: 9px; 
            text-align: justify; 
            margin-top: 3px; 
            line-height: 1.1; 
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <!-- FIXED HEADER WITHOUT LAYOUT BREAK -->
        <div class="center bold" style="font-size: 13px; letter-spacing: 0.2px;">⚡DRYCU-72H⚡</div>
        <div class="center bold" style="font-size: 11px;">AHIRAULI</div>
        <div class="center" style="font-size: 9px;">📍 Opp Indian Oil Petrol Pump<br>📞 9519705388 | www.drycu-72h.in</div>
        <div class="line"></div>
        
        <div class="bold" style="font-size: 13px; margin: 2px 0;">ORDER NO: ${formattedOrderId}</div>
        <div style="font-size: 11px;"><b>CUST:</b> ${customerName}</div>
        <div style="font-size: 11px;"><b>MOB :</b> ${customerPhone}</div>
        <div style="font-size: 11px;"><b>DATE:</b> ${formattedDate} | <b>RDY:</b> ${readyDate}</div>
        
        <div class="line"></div>
        <table style="margin-bottom: 2px;">
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <div class="line"></div>
        <table style="font-size: 11px;">
          <tr><td>TOTAL PCS</td><td style="text-align: right;">${totalPcs} Pcs</td></tr>
          <tr><td>GROSS AMT</td><td style="text-align: right;">₹${grossAmount.toFixed(2)}</td></tr>
          <tr><td>ADV PAID</td><td style="text-align: right;">₹${advance.toFixed(2)}</td></tr>
          <tr style="font-size: 12px; font-weight: 900;">
            <td style="padding-top: 2px;">🧾 DUE BAL</td>
            <td style="text-align: right; padding-top: 2px; border-top: 1px dashed #000; font-size: 13px;">₹${balance.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="line"></div>
        <div class="center bold" style="font-size: 9px;">TERMS & CONDITIONS</div>
        <div class="tc-block">
          #1. Not liable for color fastness/missing buttons. #2. Claim within 24h. #3. Complete T&C on site. #4. Not responsible for clothes left >15 days.
        </div>
        
        <div class="line"></div>
        <div class="center bold" style="font-size: 9px; margin: 4px 0;">⚡ THANK YOU ⚡</div>
        
        <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 9px;">
          <span style="border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 1px;">CUSTOMER</span>
          <span style="border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 1px;">SIGNATURE</span>
        </div>
      </body>
      </html>
    `;

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
    console.error("Bill print failed:", err);
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
    console.error("WhatsApp integration failed:", err);
  }
}
