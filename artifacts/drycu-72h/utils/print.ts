import { Platform } from "react-native";

const SERVICE_ABBR: Record<string, string> = {
  "Dry Cleaning": "DC",
  Laundry: "LD",
  Ironing: "IR",
};

function logOrderObject(order: any) {
  try {
    console.log("=== DRYCU-72H INCOMING ORDER OBJECT CONTEXT TRACE ===");
    console.log(JSON.stringify(order));
  } catch (e) {
    console.log("Order trace failed:", order);
  }
}

// ==========================================
// 1. PERFECTLY CENTERED TAGS FOR RIBBON PRINTERS
// ==========================================
export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;
  logOrderObject(order);

  try {
    let tagBlocks = "";
    const items =
      order.items || order.garments || order.orderItems || order.clothes || [];

    const orderIdStr = String(
      order.id || order.orderNumber || order.uid || "",
    ).replace(/^[A-Za-z-]+/, "");
    const formattedId = "DI-" + orderIdStr.padStart(5, "0");

    const customerName =
      order.customerName ||
      order.customer?.name ||
      order.customer?.customerName ||
      order.customer?.fullName ||
      (order.customer && typeof order.customer === "object"
        ? Object.values(order.customer)[1]
        : null) ||
      "Customer";

    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : new Date().toLocaleDateString("en-GB");
    const readyDateRaw =
      order.readyDate ||
      order.pickupDeadline ||
      order.deliveryDate ||
      order.deadline ||
      "";
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
          <!-- width changed to 100% and text-align set to center to bring content to middle of the roll -->
          <div style="width: 100%; max-width: 54mm; padding: 2px 0; margin-bottom: 8px; border-bottom: 1px dashed #000; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 900; color: #000 !important; text-align: center; page-break-inside: avoid;">
            <div style="font-size: 18px; font-weight: 900; color: #000 !important;">${formattedId}</div>
            <div style="font-size: 14px; font-weight: 900; margin-top: 2px; color: #000 !important;">${customerName}</div>
            <div style="margin: 2px 0; font-size: 13px; font-weight: 900; color: #000 !important;">
              <span>${service}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span>${i}/${totalQty}</span>
            </div>
            <div style="font-size: 11.5px; line-height: 1.2; font-weight: 900; color: #000 !important; text-align: center;">
              Ready: ${formattedReadyDate}<br>
              Item: ${item.itemName || item.name || "Garment"}<br>
              Booked: ${orderDate}
            </div>
          </div>
        `;
      }
    });

    const html =
      "<html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } * { font-weight: 900 !important; color: #000 !important; } body { margin: 0; padding: 4px; }</style></head><body>" +
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
// 2. PERFECT LENGTH DENSITY ADJUSTED BILL
// ==========================================
export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;
  logOrderObject(order);

  try {
    let itemRows = "";
    const items =
      order.items || order.garments || order.orderItems || order.clothes || [];
    let totalPcs = 0;
    let grossAmount = 0;

    const globalTotal =
      order.totalAmount ||
      order.grossAmount ||
      order.netPayable ||
      order.amount ||
      order.financials?.grossAmount ||
      order.financials?.netPayable ||
      0;

    items.forEach((item: any) => {
      const qty = item.qty || item.quantity || 1;

      let unitRate = item.price ?? item.rate ?? item.amount ?? item.cost ?? 0;
      if (unitRate === 0 && globalTotal > 0 && items.length > 0) {
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
          <td style="padding: 4px 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            • ${item.itemName || item.name || "Garment"} [${serviceAbbr}] x ${qty}
          </td>
          <td style="padding: 4px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            ₹${itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    });

    if (grossAmount === 0 || Math.abs(grossAmount - globalTotal) > 0.05) {
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
      (order.customer && typeof order.customer === "object"
        ? order.customer.name ||
          order.customer.customerName ||
          Object.values(order.customer)[1]
        : null) ||
      "Customer";

    const customerPhone =
      order.customerPhone ||
      order.customer?.phone ||
      order.customer?.mobile ||
      order.customer?.phoneNumber ||
      (order.customer && typeof order.customer === "object"
        ? order.customer.phone ||
          order.customer.mobile ||
          Object.values(order.customer)[2]
        : null) ||
      "N/A";

    const orderIdStr = String(
      order.id || order.orderNumber || order.uid || "",
    ).replace(/^[A-Za-z-]+/, "");
    const formattedOrderId = "DI-" + orderIdStr.padStart(5, "0");

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-GB")
      : new Date().toLocaleDateString("en-GB");

    const readyDateRaw =
      order.readyDate ||
      order.pickupDeadline ||
      order.deliveryDate ||
      order.deadline ||
      "TBD";
    const readyDate =
      readyDateRaw && readyDateRaw !== "TBD"
        ? new Date(readyDateRaw).toLocaleDateString("en-GB")
        : "TBD";

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Premium Concise Receipt</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 54mm; 
            padding: 5px; 
            font-size: 11.5px; 
            line-height: 1.25;
            background-color: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .line { border-top: 1.5px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 3px; }
          td { color: #000; font-weight: 900; }
          .tc-section {
            font-size: 11px; 
            text-align: left; 
            margin-top: 4px; 
            line-height: 1.25; 
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px; letter-spacing: 0.1px;">⚡DRYCU-72H⚡</div>
        <div class="center bold" style="font-size: 11.5px;">AHIRAULI</div>
        <div class="center" style="font-size: 9.5px;">📍 Opp Indian Oil Petrol Pump<br>📞 9519705388 | www.drycu-72h.in</div>
        <div class="line"></div>
        
        <div class="bold" style="font-size: 13px; margin-bottom: 2px;">ORDER NO: ${formattedOrderId}</div>
        <div style="font-size: 12px; margin-bottom: 1px;"><b>CUST:</b> ${customerName}</div>
        <div style="font-size: 12px; margin-bottom: 1px;"><b>MOB :</b> ${customerPhone}</div>
        <div style="font-size: 11.5px;"><b>DATE:</b> ${formattedDate} | <b>RDY:</b> ${readyDate}</div>
        
        <div class="line"></div>
        <div class="bold" style="font-size: 11px; letter-spacing: 0.5px; margin-bottom: 2px;">ITEM DETAILS</div>
        <table>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <div class="line"></div>
        <table style="font-size: 12px;">
          <tr><td>TOTAL PCS</td><td style="text-align: right;">${totalPcs} Pcs</td></tr>
          <tr><td>GROSS AMT</td><td style="text-align: right;">₹${grossAmount.toFixed(2)}</td></tr>
          <tr><td>ADV PAID</td><td style="text-align: right;">₹${advance.toFixed(2)}</td></tr>
          <tr style="font-size: 13px; font-weight: 900;">
            <td style="padding-top: 3px;">🧾 DUE BAL</td>
            <td style="text-align: right; padding-top: 3px; border-top: 1.5px dashed #000; font-size: 14px;">₹${balance.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="line"></div>
        <div class="center bold" style="font-size: 11px; letter-spacing: 0.5px;">TERMS & CONDITIONS</div>
        <div class="tc-section">
          #1. Not liable for color fastness, threads-out, or missing buttons.<br>
          #2. Report damage or mixed clothes within 24 hours of delivery.<br>
          #3. Complete legal Terms and Conditions on our site/app.<br>
          #4. Unforeseen logistics delays will be notified proactively.<br>
          #5. No store liability for damage due to sudden fire or burglary.<br>
          #6. Store not responsible for garments left over 15 days.
        </div>
        
        <div class="line"></div>
        <div class="center bold" style="font-size: 10px; margin: 4px 0;">⚡ THANK YOU ⚡</div>
        
        <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 9.5px;">
          <span style="border-top: 1.5px solid #000; width: 45%; text-align: center; padding-top: 2px;">CUSTOMER</span>
          <span style="border-top: 1.5px solid #000; width: 45%; text-align: center; padding-top: 2px;">SIGNATURE</span>
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
