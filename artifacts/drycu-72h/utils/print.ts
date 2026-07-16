import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC',
  'Laundry': 'LD',
  'Ironing': 'IR',
  'Top Up': 'TP',
  'Topup': 'TP',
  'DC': 'DC',
  'LD': 'LD',
  'IR': 'IR',
  'TP': 'TP'
};

export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
}

export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    let grossAmount = 0;
    let advance = 0;
    let balance = 0;
    let customerName = 'Customer';
    let customerPhone = 'N/A';
    let orderNumber = 'DI-' + String(Math.floor(Math.random() * 90000) + 10000);

    let detectedItems: Array<{name: string, service: string, qty: number, price: number}> = [];

    // ==========================================
    // 🧠 DIRECT VISUAL HTML DOM EXTRACTION (NO STATE DEPENDENCY)
    // ==========================================
    if (typeof document !== 'undefined') {
      const allText = document.body.innerText || '';

      // 1. Scan Phone Number from Screen
      const phoneMatch = allText.match(/[6-9]\d{9}/);
      if (phoneMatch) customerPhone = phoneMatch[0];

      // 2. Scan Order ID / Invoice Number from Screen
      const orderMatch = allText.match(/DI-\d+/i);
      if (orderMatch) orderNumber = orderMatch[0].toUpperCase();

      // 3. Scan Inputs & Text Fields for Customer Name dynamically
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((inp: any) => {
        const val = inp.value ? inp.value.trim() : '';
        if (!val || val.length < 2) return;

        if (/^\d{10}$/.test(val)) {
          customerPhone = val;
        } else if (isNaN(Number(val))) {
          const parentHtml = inp.parentElement ? inp.parentElement.innerText.toLowerCase() : '';
          const placeholder = (inp.placeholder || '').toLowerCase();
          if (placeholder.includes('name') || placeholder.includes('cust') || parentHtml.includes('name') || parentHtml.includes('cust')) {
            customerName = val;
          }
        }
      });

      // 4. Try to pick customer name from text elements if still default
      if (customerName === 'Customer') {
        const headings = document.querySelectorAll('h1, h2, h3, h4, p, span, div, td');
        for (let el of Array.from(headings)) {
          const txt = (el as HTMLElement).innerText || '';
          if (/^(customer|name|cust)\s*:\s*/i.test(txt)) {
            const cleaned = txt.replace(/^(customer|name|cust)\s*:\s*/i, '').trim();
            if (cleaned && cleaned.length > 2 && cleaned.length < 25 && !cleaned.toLowerCase().includes('pm')) {
              customerName = cleaned;
              break;
            }
          }
        }
      }

      // 5. Scan table rows or list containers for ACTUAL selected items
      const rows = document.querySelectorAll('table tr, .item-row, .cart-item, div[class*="item"]');
      rows.forEach((row: any) => {
        const txt = row.innerText || '';
        if (txt.includes('Total') || txt.includes('Price') || txt.includes('Action') || txt.trim().length < 4) return;

        const cells = row.querySelectorAll('td, span, div');
        if (cells.length >= 2) {
          const nameCand = cells[0].innerText ? cells[0].innerText.trim() : '';
          if (nameCand && isNaN(Number(nameCand)) && nameCand.length > 1 && !['sr', 'no', 'item', 'action'].some(w => nameCand.toLowerCase().includes(w))) {
            const priceMatch = txt.match(/(?:₹|\$)?\s*(\d+(?:\.\d+)?)/);
            const rPrice = priceMatch ? Number(priceMatch[1]) : 0;
            
            // Service check including Top Up
            let svc = 'DC';
            if (txt.toLowerCase().includes('laundry')) svc = 'LD';
            else if (txt.toLowerCase().includes('iron')) svc = 'IR';
            else if (txt.toLowerCase().includes('top up') || txt.toLowerCase().includes('topup')) svc = 'TP';

            detectedItems.push({
              name: nameCand,
              service: svc,
              qty: 1,
              price: rPrice
            });
          }
        }
      });
    }

    // ==========================================
    // 🧮 STATE DATA FALLBACK (If DOM parsing is partial)
    // ==========================================
    const targetOrder = order || (window as any).currentOrder || (window as any).activeOrder;
    if (targetOrder) {
      grossAmount = Number(targetOrder.totalAmount || targetOrder.grossAmount || targetOrder.amount || grossAmount);
      advance = Number(targetOrder.advanceAmount || targetOrder.advancePaid || advance);
      balance = grossAmount - advance;
      
      if (targetOrder.id || targetOrder.orderNumber) {
        const cleanId = String(targetOrder.id || targetOrder.orderNumber).replace(/^[A-Za-z-]+/, '');
        orderNumber = "DI-" + cleanId.padStart(5, '0');
      }

      if (targetOrder.customerName || targetOrder.customerDetails?.name) {
        customerName = targetOrder.customerName || targetOrder.customerDetails.name;
      }
      if (targetOrder.customerPhone || targetOrder.customerDetails?.phone) {
        customerPhone = targetOrder.customerPhone || targetOrder.customerDetails.phone;
      }

      const stateItems = targetOrder.items || targetOrder.garments || [];
      if (stateItems.length > 0 && detectedItems.length === 0) {
        stateItems.forEach((item: any) => {
          detectedItems.push({
            name: item.name || item.itemName || 'Garment',
            service: SERVICE_ABBR[item.service] || item.service || 'DC',
            qty: item.qty || item.quantity || 1,
            price: Number(item.price || item.rate || 0)
          });
        });
      }
    }

    if (detectedItems.length === 0) {
      detectedItems = [{ name: 'Garment Processing', service: 'DC', qty: 1, price: grossAmount || 0 }];
    }

    const totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);
    if (grossAmount === 0) {
      grossAmount = detectedItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
      balance = grossAmount - advance;
    }

    let rowsHtml = '';
    detectedItems.forEach((item) => {
      rowsHtml += `
        <tr style="vertical-align: top;">
          <td style="padding: 4px 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            • ${item.name} [${item.service}] x ${item.qty}
          </td>
          <td style="padding: 4px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            ₹${(item.price * item.qty).toFixed(2)}
          </td>
        </tr>
      `;
    });

    const formattedDate = new Date().toLocaleDateString('en-GB');
    const readyDate = '19/07/2026';

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Invoice</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 54mm; padding: 5px; font-size: 11.5px; line-height: 1.25; background-color: #fff; }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .line { border-top: 1.5px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 3px; }
          td { color: #000; font-weight: 900; }
          .tc-section { font-size: 11px; text-align: left; margin-top: 4px; line-height: 1.25; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px; letter-spacing: 0.1px;">⚡DRYCU-72H⚡</div>
        <div class="center bold" style="font-size: 11.5px;">AHIRAULI</div>
        <div class="center" style="font-size: 9.5px;">📍 Opp Indian Oil Petrol Pump<br>📞 9519705388 | www.drycu-72h.in</div>
        <div class="line"></div>
        <div class="bold" style="font-size: 13px; margin-bottom: 2px;">ORDER NO: ${orderNumber}</div>
        <div style="font-size: 12px; margin-bottom: 1px;"><b>CUST:</b> ${customerName}</div>
        <div style="font-size: 12px; margin-bottom: 1px;"><b>MOB :</b> ${customerPhone}</div>
        <div style="font-size: 11.5px;"><b>DATE:</b> ${formattedDate} | <b>RDY:</b> ${readyDate}</div>
        <div class="line"></div>
        <div class="bold" style="font-size: 11px; letter-spacing: 0.5px; margin-bottom: 2px;">ITEM DETAILS</div>
        <table><tbody>${rowsHtml}</tbody></table>
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

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 400);
    }
  } catch (err) {
    console.error(err);
  }
}

export function sendWhatsAppNotification(order: any, customerPhone: string, encodedMessage: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try { window.open("https://web.whatsapp.com/send?phone=" + customerPhone + "&text=" + encodedMessage, '_blank'); } catch (e) {}
}
// feature-topup-added-successfully: 711029
