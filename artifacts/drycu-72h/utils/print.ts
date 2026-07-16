import { Platform } from "react-native";

const SERVICE_ABBR: Record<string, string> = {
  "Dry Cleaning": "DC",
  Laundry: "LD",
  Ironing: "IR",
};

// ==========================================
// 1. EXACT CLOTH TAGS FORMATTING (DI PREFIX)
// ==========================================
export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let tagBlocks = "";
    const items = order.items || [];

    const orderIdStr = String(order.id || "").replace(/^[A-Za-z-]+/, "");
    const formattedId = "DI-" + orderIdStr.padStart(5, "0");

    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "";
    const readyDate = order.readyDate
      ? new Date(order.readyDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "";

    items.forEach((item: any) => {
      const service =
        SERVICE_ABBR[item.serviceType] || item.serviceType || "DC";
      const totalQty = item.qty || 1;

      for (let i = 1; i <= totalQty; i++) {
        tagBlocks += `
          <div style="width: 50mm; padding: 4px; margin-bottom: 15px; border-bottom: 2px dashed #000; font-family: 'Courier New', monospace; font-size: 13px; color: #000; page-break-inside: avoid;">
            <div style="font-size: 19px; font-weight: bold; text-align: left; letter-spacing: 0.5px;">${formattedId}</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 2px;">${order.customerName || "Customer"}</div>
            <div style="margin: 3px 0; font-size: 13px;">
              <span>${service}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span>${i}/${totalQty}</span>
            </div>
            <div style="font-size: 11px; margin-top: 2px; line-height: 1.2;">
              Ready: ${readyDate}<br>
              Item: ${item.itemName || ""}<br>
              Booked: ${orderDate}
            </div>
          </div>
        `;
      }
    });

    const html =
      "<html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 4px; }</style></head><body>" +
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
// 2. MODERN & ATTRACTIVE PREMIUM VIBE BILL
// ==========================================
export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let itemRows = "";
    const items = order.items || [];
    let totalPcs = 0;
    let grossAmount = 0;

    items.forEach((item: any) => {
      const qty = item.qty || 1;
      const unitRate = item.price ?? item.rate ?? item.amount ?? 0;
      const itemTotal = unitRate * qty;

      totalPcs += qty;
      grossAmount += itemTotal;

      const serviceAbbr =
        SERVICE_ABBR[item.serviceType] || item.serviceType || "DC";

      itemRows += `
        <tr style="vertical-align: top;">
          <td style="padding: 6px 0; font-family: 'Courier New', monospace; font-size: 12px;">
            <div style="font-weight: bold;">• ${item.itemName || ""}</div>
            <div style="font-size: 10px; padding-left: 10px; color: #555;">[${serviceAbbr}] x ${qty}</div>
          </td>
          <td style="padding: 6px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold;">
            ${itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    });

    if (grossAmount === 0 && order.totalAmount) {
      grossAmount = order.totalAmount;
    }

    const advance = order.advanceAmount || 0;
    const balance = grossAmount - advance;

    const orderIdStr = String(order.id || "").replace(/^[A-Za-z-]+/, "");
    const formattedOrderId = "DI-" + orderIdStr.padStart(5, "0");

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-US", { hour12: true })
      : new Date().toLocaleString();
    const readyDate = order.readyDate
      ? new Date(order.readyDate).toLocaleString("en-US", { hour12: true })
      : "TBD";

    const html = `
      <html>
      <head>
        <title>Premium Bill</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 54mm; margin: 0; padding: 6px; font-size: 11px; color: #000; line-height: 1.3; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .double-line { border-top: 2px solid #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 15px; letter-spacing: 1px;">⚡ D R Y C U - 7 2 H ⚡</div>
        <div class="center bold" style="font-size: 12px; margin-top: 1px;">A H I R A U L I</div>
        <div class="center" style="font-size: 9px; margin-top: 3px;">📍 Opp Indian Oil Petrol Pump, Ahirauli<br>📞 Contact: 9519705388<br>🌐 www.drycu-72h.in</div>
        <div class="line"></div>
        <div class="center bold" style="font-size: 9px; letter-spacing: 0.5px;">[ ZERO ERROR • NEATNESS OBJECTIVE ]</div>
        <div class="double-line"></div>
        
        <div class="bold" style="font-size: 16px; margin: 4px 0;">ORDER NO: 💥 ${formattedOrderId} 💥</div>
        <div style="font-size: 12px; margin-bottom: 2px;"><b>CUSTOMER :</b> ${order.customerName || "Customer"}</div>
        <div><b>PHONE    :</b> ${order.customerPhone || "N/A"}</div>
        <div><b>DATE     :</b> ${formattedDate}</div>
        
        <div class="double-line"></div>
        <div class="bold" style="font-size: 11px; letter-spacing: 0.5px;">ITEM DETAILS</div>
        <div class="line"></div>
        
        <table>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <div class="double-line"></div>
        <div class="bold" style="font-size: 11px; letter-spacing: 0.5px;">TOTAL SUMMARY</div>
        <div class="line"></div>
        
        <table style="font-size: 12px;">
          <tr>
            <td>TOTAL PCS</td>
            <td style="text-align: right; font-weight: bold;">${totalPcs} Pcs</td>
          </tr>
          <tr>
            <td>GROSS AMOUNT</td>
            <td style="text-align: right; font-weight: bold;">₹ ${grossAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>ADVANCE PAID</td>
            <td style="text-align: right;">₹ ${advance.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 13px; font-weight: bold;">
            <td style="padding-top: 5px;">🧾 BALANCE DUE</td>
            <td style="text-align: right; padding-top: 5px; border-top: 1px dashed #000;">₹ ${balance.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="double-line"></div>
        <div style="margin: 3px 0; font-size: 11px;">📅 <b>READY ON:</b> ${readyDate}</div>
        <div style="font-size: 11px;">⏱️ <b>TIMING  :</b> 9:00 AM - 8:00 PM</div>
        <div class="double-line"></div>
        
        <div class="center bold" style="font-size: 10px;">TERMS & CONDITIONS</div>
        <div style="font-size: 9px; text-align: justify; margin-top: 4px; line-height: 1.2;">
          #1. DRYCU-72H is not liable for color fastness, threads-out, missing buttons, or any other damages.<br>
          #2. Report damages, missing items, or exchanged clothes within 24 hours of delivery.<br>
          #3. Refer to our website for complete Terms and Conditions.<br>
          #4. We aim for on-time delivery, but if delays occur due to unforeseen circumstances, we'll keep you updated.<br>
          #5. We accept no liability for any loss or damage of clothes arising due to washing, fire, burglary etc.<br>
          #6. If the customer fails to collect their clothes within 15 days of the delivery date, the store shall not be held responsible for any loss or damage.
        </div>
        
        <div class="double-line"></div>
        <div class="center bold" style="font-size: 10px; margin: 8px 0;">⚡ THANK YOU FOR CHOOSING US ⚡</div>
        
        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 9px;">
          <span style="border-top: 1px solid #000; width: 75px; text-align: center; padding-top: 2px;">CUSTOMER</span>
          <span style="border-top: 1px solid #000; width: 75px; text-align: center; padding-top: 2px;">SIGNATURE</span>
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
