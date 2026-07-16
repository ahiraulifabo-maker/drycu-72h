import { Platform } from "react-native";

const SERVICE_ABBR: Record<string, string> = {
  "Dry Cleaning": "DC",
  Laundry: "LD",
  Ironing: "IR",
};

// ==========================================
// 1. PERFECTLY CENTERED TAGS FOR RIBBON PRINTER
// ==========================================
export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let tagBlocks = "";
    const items =
      order.items || order.garments || order.orderItems || order.clothes || [];

    const orderIdStr = String(
      order.id || order.orderNumber || order.uid || "",
    ).replace(/^[A-Za-z-]+/, "");
    const formattedId = "DI-" + orderIdStr.padStart(5, "0");

    // Safe lookup if data is string key token
    let customerName = "Customer";
    if (order.customerName || order.customer_name) {
      customerName = order.customerName || order.customer_name;
    } else if (order.customer && typeof order.customer === "object") {
      customerName =
        order.customer.name ||
        order.customer.customerName ||
        order.customer.fullName ||
        "Customer";
    } else if (
      typeof order.customer === "string" &&
      !/^[0-9a-zA-Z]{15,}$/.test(order.customer)
    ) {
      customerName = order.customer;
    }

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
// 2. EXTRA CONCISE BILL (STRUCTURAL STABILITY PATCH)
// ==========================================
export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== "web" || typeof window === "undefined" || !order) return;

  try {
    let itemRows = "";
    const items =
      order.items || order.garments || order.orderItems || order.clothes || [];
    let totalPcs = 0;

    const grossAmount = Number(
      order.totalAmount ||
        order.grossAmount ||
        order.netPayable ||
        order.amount ||
        0,
    );
    const advance = Number(
      order.advanceAmount || order.advancePaid || order.advance || 0,
    );
    const balance = Number(
      order.balanceDue || order.balance || grossAmount - advance,
    );

    // Calculate total count first for balanced visual distribution if items miss database pricing arrays
    items.forEach((item: any) => {
      totalPcs += item.qty || item.quantity || 1;
    });
    if (totalPcs === 0) totalPcs = items.length || 1;

    items.forEach((item: any) => {
      const qty = item.qty || item.quantity || 1;

      // Extraction rules matching operational states
      let unitRate = Number(
        item.price || item.rate || item.unitPrice || item.itemPrice || 0,
      );

      // Mathematical breakdown patch if individual arrays fail to pass native price metrics to avoid zero artifacts
      if (unitRate === 0 && grossAmount > 0) {
        unitRate = grossAmount / totalPcs;
      }

      const itemTotal = unitRate * qty;
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

    // Resolve Customer Identification and Profile details
    let customerName = "Customer";
    let customerPhone = "N/A";

    if (order.customerName || order.customer_name) {
      customerName = order.customerName || order.customer_name;
    } else if (order.customer && typeof order.customer === "object") {
      customerName =
        order.customer.name || order.customer.customerName || "Customer";
    }

    if (order.customerPhone || order.customer_phone) {
      customerPhone = order.customerPhone || order.customer_phone;
    } else if (order.customer && typeof order.customer === "object") {
      customerPhone = order.customer.phone || order.customer.mobile || "N/A";
    }

    // IF SYSTEM OUTPUTS A CRYPTIC UID INSTEAD OF STRINGS, DO AN ALTERNATIVE MAPPING INTERSECTION
    if (
      /^[0-9a-zA-Z_-]{15,}$/.test(customerName) ||
      customerName === "Customer"
    ) {
      if (order.customerDetails?.name)
        customerName = order.customerDetails.name;
      else if (order.clientName) customerName = order.clientName;
      else if (order.user?.name) customerName = order.user.name;
    }

    if (customerPhone === "N/A") {
      if (order.customerDetails?.phone || order.customerDetails?.mobile)
        customerPhone =
          order.customerDetails.phone || order.customerDetails.mobile;
      else if (order.clientPhone) customerPhone = order.clientPhone;
      else if (order.user?.phone || order.user?.mobile)
        customerPhone = order.user.phone || order.user.mobile;
    }

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
