const SERVICE_ABBR: Record<string, string> = {
  "Dry Cleaning": "DC",
  Laundry: "LD",
  Ironing: "IR",
};

// ==========================================
// 1. FIXED & FULLY COMPATIBLE CLOTH TAGS
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

    // Robust dynamic object safety parsing for customer details
    const customerName =
      order.customerName ||
      order.customer?.name ||
      order.customer?.customerName ||
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
          <div style="width: 50mm; padding: 4px; margin-bottom: 15px; border-bottom: 2px dashed #000; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 900; color: #000 !important; page-break-inside: avoid;">
            <div style="font-size: 20px; font-weight: 900; text-align: left; letter-spacing: 0.5px; color: #000 !important;">${formattedId}</div>
            <div style="font-size: 15px; font-weight: 900; margin-top: 2px; color: #000 !important;">${customerName}</div>
            <div style="margin: 3px 0; font-size: 14px; font-weight: 900; color: #000 !important;">
              <span>${service}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span>${i}/${totalQty}</span>
            </div>
            <div style="font-size: 12px; margin-top: 2px; line-height: 1.2; font-weight: 900; color: #000 !important;">
              Ready: ${formattedReadyDate}<br>
              Item: ${item.itemName || item.name || ""}<br>
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
// 2. EXTRA BOLD PREMIUM VIBE BILL (STAYS FRESH)
// ==========================================
export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let itemRows = "";
    const items = order.items || order.garments || order.orderItems || [];
    let totalPcs = 0;
    let grossAmount = 0;

    items.forEach((item: any) => {
      const qty = item.qty || item.quantity || 1;
      const unitRate = item.price ?? item.rate ?? item.amount ?? item.cost ?? 0;
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
          <td style="padding: 6px 0; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 900; color: #000 !important;">
            <div style="font-weight: 900;">• ${item.itemName || item.name || "Garment Item"}</div>
            <div style="font-size: 11px; padding-left: 10px; font-weight: 900; color: #000 !important;">[${serviceAbbr}] x ${qty}</div>
          </td>
          <td style="padding: 6px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 900; color: #000 !important;">
            ₹ ${itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    });

    if (grossAmount === 0) {
      grossAmount =
        order.totalAmount ||
        order.grossAmount ||
        order.netPayable ||
        order.financials?.grossAmount ||
        0;
    }
    if (totalPcs === 0) {
      totalPcs = order.totalQty || order.totalQuantity || order.totalPcs || 1;
    }

    const advance =
      order.advanceAmount || order.advancePaid || order.advance || 0;
    const balance = grossAmount - advance;

    const customerName =
      order.customerName ||
      order.customer?.name ||
      order.customer?.customerName ||
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
      ? new Date(order.createdAt).toLocaleString("en-US", { hour12: true })
      : new Date().toLocaleString();

    const readyDateRaw =
      order.readyDate || order.pickupDeadline || order.deliveryDate || "TBD";
    const readyDate =
      readyDateRaw && readyDateRaw !== "TBD"
        ? new Date(readyDateRaw).toLocaleString("en-US", { hour12: true })
        : "TBD";

    const html = `
      <html>
      <head>
        <title>Premium Extra Bold Bill</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 54mm; 
            margin: 0; 
            padding: 6px; 
            font-size: 12px; 
            line-height: 1.3;
            background-color: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .line { border-top: 2px dashed #000; margin: 6px 0; }
          .double-line { border-top: 3px double #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          td, th { color: #000; font-weight: 900; }
          .tc-block {
            font-size: 10.5px; 
            text-align: justify; 
            margin-top: 4px; 
            line-height: 1.3; 
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px; letter-spacing: 1px;">⚡ D R Y C U - 7 2 H ⚡</div>
        <div class="center bold" style="font-size: 13px; margin-top: 1px;">A H I R A U L I</div>
        <div class="center" style="font-size: 10px; margin-top: 3px;">📍 Opp Indian Oil Petrol Pump, Ahirauli<br>📞 Contact: 9519705388<br>🌐 www.drycu-72h.in</div>
        <div class="line"></div>
        <div class="center bold" style="font-size: 10px; letter-spacing: 0.5px;">[ ZERO ERROR • NEATNESS OBJECTIVE ]</div>
        <div class="double-line"></div>
        
        <div class="bold" style="font-size: 17px; margin: 4px 0;">ORDER NO: 💥 ${formattedOrderId} 💥</div>
        <div style="font-size: 13px; margin-bottom: 2px;"><b>CUSTOMER :</b> ${customerName}</div>
        <div style="font-size: 13px; margin-bottom: 2px;"><b>PHONE    :</b> ${customerPhone}</div>
        <div style="font-size: 12px;"><b>DATE     :</b> ${formattedDate}</div>
        
        <div class="double-line"></div>
        <div class="bold" style="font-size: 12px; letter-spacing: 0.5px;">ITEM DETAILS</div>
        <div class="line"></div>
        
        <table>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <div class="double-line"></div>
        <div class="bold" style="font-size: 12px; letter-spacing: 0.5px;">TOTAL SUMMARY</div>
        <div class="line"></div>
        
        <table style="font-size: 13px;">
          <tr>
            <td>TOTAL PCS</td>
            <td style="text-align: right; font-weight: 900;">${totalPcs} Pcs</td>
          </tr>
          <tr>
            <td>GROSS AMOUNT</td>
            <td style="text-align: right; font-weight: 900;">₹ ${grossAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>ADVANCE PAID</td>
            <td style="text-align: right; font-weight: 900;">₹ ${advance.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 14px; font-weight: 900;">
            <td style="padding-top: 6px;">🧾 BALANCE DUE</td>
            <td style="text-align: right; padding-top: 6px; border-top: 2px dashed #000; font-size: 15px;">₹ ${balance.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="double-line"></div>
        <div style="margin: 4px 0; font-size: 12px;">📅 <b>READY ON:</b> ${readyDate}</div>
        <div style="font-size: 12px;">⏱️ <b>TIMING  :</b> 9:00 AM - 8:00 PM</div>
        <div class="double-line"></div>
        
        <div class="center bold" style="font-size: 11px; letter-spacing: 0.5px;">TERMS & CONDITIONS</div>
        <div class="tc-block">
          #1. DRYCU-72H is not liable for color fastness, threads-out, missing buttons, or any other damages.<br>
          #2. Report damages, missing items, or exchanged clothes within 24 hours of delivery.<br>
          #3. Refer to our website for complete Terms and Conditions.<br>
          #4. We aim for on-time delivery, but if delays occur due to unforeseen circumstances, we'll keep you updated.<br>
          #5. We accept no liability for any loss or damage of clothes arising due to washing, fire, burglary etc.<br>
          #6. If the customer fails to collect their clothes within 15 days of the delivery date, the store shall not be held responsible for any loss or damage.
        </div>
        
        <div class="double-line"></div>
        <div class="center bold" style="font-size: 11px; margin: 10px 0;">⚡ THANK YOU FOR CHOOSING US ⚡</div>
        
        <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 10px;">
          <span style="border-top: 2px solid #000; width: 80px; text-align: center; padding-top: 2px; font-weight: 900;">CUSTOMER</span>
          <span style="border-top: 2px solid #000; width: 80px; text-align: center; padding-top: 2px; font-weight: 900;">SIGNATURE</span>
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
