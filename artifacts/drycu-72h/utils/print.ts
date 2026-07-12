import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC',
  'Laundry': 'LD',
  'Ironing': 'IR',
};

// ==========================================
// 1. LAUNDRY TAGS PRINTING LOGIC
// ==========================================
export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;
  if (!order || !storeInfo) return;

  try {
    let tagBlocks = '';
    const items = order.items || [];
    
    items.forEach((item: any) => {
      const service = SERVICE_ABBR[item.serviceType] || item.serviceType || '';
      const totalQty = item.qty || 1;

      for (let i = 1; i <= totalQty; i++) {
        tagBlocks += `
          <div class="tag" style="padding: 6px; margin-bottom: 20px; border-bottom: 3px dashed #000000; text-align: center; page-break-inside: avoid;">
            <div class="store" style="font-weight: 900; color: #000000; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Arial Black', Gadget, sans-serif;">${storeInfo.name || ''}</div>
            <div class="dt" style="font-weight: 900; color: #000000; font-size: 18px; border: 3px solid #000000; display: inline-block; padding: 2px 8px; margin: 6px 0; font-family: 'Arial Black', Gadget, sans-serif;">TAG NO: DI-${order.id || ''} (${i}/${totalQty})</div>
            <div style="border-top: 2px solid #000000; margin: 5px 0;"></div>
            <div class="garment" style="font-weight: 900; color: #000000; font-size: 17px; text-align: left; font-family: 'Arial Black', sans-serif;">Item: ${item.itemName || ''}</div>
            <div class="service" style="font-weight: 900; color: #000000; font-size: 16px; text-align: left; margin-top: 4px; font-family: 'Arial Black', sans-serif;">Service: ${service}</div>
          </div>
        `;
      }
    });

    const html = "<html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } body { font-family: 'Arial Black', Arial, sans-serif; width: 58mm; margin: 0; padding: 3px; color: #000000; -webkit-print-color-adjust: exact; }</style></head><body>" + tagBlocks + "</body></html>";
    
    const win = window.open('', '_blank');
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

// ==========================================
// 2. ACTUAL DRYCU-72H BILL PRINTING LOGIC
// ==========================================
export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;
  if (!order || !storeInfo) return;

  try {
    let itemRows = '';
    const items = order.items || [];
    let totalPcs = 0;
    let grossAmount = 0;

    items.forEach((item: any) => {
      const qty = item.qty || 1;
      const rate = item.rate || 0;
      const itemTotal = rate * qty;
      totalPcs += qty;
      grossAmount += itemTotal;
      
      const serviceAbbr = SERVICE_ABBR[item.serviceType] || item.serviceType || '';

      itemRows += `
        <tr style="border-bottom: 1px dashed #ddd;">
          <td style="padding: 6px 0; max-width: 110px; word-wrap: break-word;">${item.itemName || ''}</td>
          <td style="text-align: center; padding: 6px 0;">${qty}</td>
          <td style="text-align: center; padding: 6px 0;">${serviceAbbr}</td>
          <td style="text-align: right; padding: 6px 0;">${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    const advance = order.advanceAmount || 0;
    const balance = grossAmount - advance;
    const orderIdStr = String(order.id || '').replace(/^[A-Za-z-]+/, '');
    const formattedOrderId = "DI-" + orderIdStr.padStart(5, '0');
    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
    const readyDate = order.readyDate ? new Date(order.readyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';

    const html = "<html><head><title>Bill</title><style>@page { size: 58mm auto; margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 54mm; margin: 0; padding: 6px; font-size: 11px; color: #000; line-height: 1.2; } .center { text-align: center; } .bold { font-weight: bold; } table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; } .line { border-top: 1px dashed #000; margin: 6px 0; }</style></head><body>" +
      "<div class='center bold' style='font-size: 16px;'>" + (storeInfo.name || 'DRYCU-72H') + "</div>" +
      "<div class='center'>" + (storeInfo.address || 'Opp Indian Oil Petrol Pump, Ahirauli') + "</div>" +
      "<div class='center'>Contact: " + (storeInfo.phone || '9519705388') + "</div>" +
      "<div class='line'></div>" +
      "<div class='bold' style='font-size: 15px; margin: 4px 0;'>" + formattedOrderId + "</div>" +
      "<div><b>" + (order.customerName || 'Customer') + "</b></div>" +
      "<div>Mob: " + (order.customerPhone || '') + "</div>" +
      "<div>" + formattedDate + "</div>" +
      "<div class='line'></div>" +
      "<table>" +
        "<thead><tr class='bold' style='border-bottom: 1px dashed #000;'><th style='text-align: left; padding-bottom: 4px;'>Item</th><th style='text-align: center; padding-bottom: 4px;'>Qty</th><th style='text-align: center; padding-bottom: 4px;'>Service</th><th style='text-align: right; padding-bottom: 4px;'>INR</th></tr></thead>" +
        "<tbody>" + itemRows + "</tbody>" +
      "</table>" +
      "<div class='line'></div>" +
      "<table style='margin-top: 2px;'>" +
        "<tr><td><b>T.Pcs</b></td><td style='text-align: center;'>" + totalPcs + "</td><td style='text-align: right;'><b>G Amt.</b></td><td style='text-align: right; width: 65px;'>" + grossAmount.toFixed(2) + "</td></tr>" +
        "<tr><td colspan='2'></td><td style='text-align: right;'><b>Adv</b></td><td style='text-align: right;'>" + advance.toFixed(2) + "</td></tr>" +
        "<tr><td colspan='2'></td><td style='text-align: right;'><b>Bal.Amt.</b></td><td style='text-align: right;' class='bold'>" + balance.toFixed(2) + "</td></tr>" +
      "</table>" +
      "<div class='line'></div>" +
      "<div style='margin: 4px 0;'><b>Ready On:</b> " + readyDate + "</div>" +
      "<div><b>Store Timing:</b> 9.00 a.m - 8.00 p.m</div>" +
      "<div class='line'></div>" +
      "<div class='bold' style='font-size: 10px; text-transform: uppercase;'>Terms and Conditions</div>" +
      "<div style='font-size: 9px; text-align: justify; margin-top: 2px;'>" +
        "#1. DRYCU-72H is not liable for color fastness, threads-out, missing buttons, or any other damages.<br>" +
        "#2. Report damages, missing items, or exchanged clothes within 24 hours of delivery.<br>" +
        "#3. Refer to our website or app for complete Terms and Conditions.<br>" +
        "#4. We aim for on-time delivery, but if delays occur due to unforeseen circumstances, we'll keep you updated.<br>" +
        "#5. We accept no liability for any loss or damage of clothes arising due to washing, fire, burglary etc.<br>" +
        "#6. If the customer fails to collect their clothes within 15 days of the delivery date, the store shall not be held responsible for any loss or damage." +
      "</div>" +
      "<div style='margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px;'>" +
        "<span style='border-top: 1px solid #000; width: 70px; text-align: center; padding-top: 2px;'>Customer</span>" +
        "<span style='border-top: 1px solid #000; width: 70px; text-align: center; padding-top: 2px; text-align: right;'>Signature</span>" +
      "</div>" +
      "</body></html>";

    const win = window.open('', '_blank');
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

// ==========================================
// 3. WHATSAPP NOTIFICATION
// ==========================================
export function sendWhatsAppNotification(order: any, customerPhone: string, encodedMessage: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const whatsappUrl = "https://web.whatsapp.com/send?phone=" + customerPhone + "&text=" + encodedMessage;
    window.open(whatsappUrl, '_blank');
  } catch (err) {
    console.error("WhatsApp error caught:", err);
  }
}