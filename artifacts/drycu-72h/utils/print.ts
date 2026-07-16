import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC',
  'Laundry': 'LD',
  'Ironing': 'IR',
};

export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
}

export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    let grossAmount = 10.00;
    let advance = 0.00;
    let balance = 10.00;
    let customerName = 'Customer';
    let customerPhone = 'N/A';
    let orderNumber = 'DI-00022';

    if (typeof document !== 'undefined') {
      const allText = document.body.innerText || '';
      const phoneMatch = allText.match(/(?:📞|Mob|Phone|Mobile|📌)\s*[:.-]?\s*([6-9]\d{9})/i);
      if (phoneMatch) customerPhone = phoneMatch[1];

      // Deep scan all potential input fields on the screen right now
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((inp: any) => {
        const val = inp.value ? inp.value.trim() : '';
        if (!val) return;
        
        if (/^[6-9]\d{9}$/.test(val)) {
          customerPhone = val;
        } else if (val.length > 2 && isNaN(val) && !val.includes('@') && !['dry', 'clean', 'true', 'false', 'order', 'cash'].some(w => val.toLowerCase().includes(w))) {
          customerName = val;
        }
      });
      
      // Look for custom text elements on screen containing pricing
      const allDivs = document.querySelectorAll('div, span, p, td');
      allDivs.forEach((el: any) => {
        const txt = el.innerText ? el.innerText.trim() : '';
        if (!txt) return;
        if (txt.includes('DI-') || txt.includes('Order #')) {
          const m = txt.match(/(?:DI-\d+|Order\s*#\s*\d+)/i);
          if (m) orderNumber = m[0];
        }
      });
    }

    if (order) {
      grossAmount = Number(order.totalAmount || order.grossAmount || order.netPayable || order.amount || 10);
      advance = Number(order.advanceAmount || order.advancePaid || order.advance || 0);
      balance = Number(order.balanceDue || order.balance || (grossAmount - advance));
      
      if (order.id || order.orderNumber) {
        const idStr = String(order.id || order.orderNumber).replace(/^[A-Za-z-]+/, '');
        orderNumber = "DI-" + idStr.padStart(5, '0');
      }

      if (order.customerName || order.customer_name) customerName = order.customerName || order.customer_name;
      else if (order.customerDetails?.name) customerName = order.customerDetails.name;

      if (order.customerPhone || order.customer_phone) customerPhone = order.customerPhone || order.customer_phone;
      else if (order.customerDetails?.phone) customerPhone = order.customerDetails.phone;
    }

    let detectedItems: Array<{name: string, service: string, qty: number, price: number}> = [];
    const itemsArray = order?.items || order?.garments || order?.orderItems || [];

    if (itemsArray && itemsArray.length > 0) {
      itemsArray.forEach((item: any) => {
        const qty = item.qty || item.quantity || 1;
        const service = SERVICE_ABBR[item.serviceType || item.service] || item.serviceType || item.service || 'DC';
        const name = item.itemName || item.name || 'Garment';
        let price = Number(item.itemPrice || item.price || item.rate || 0);
        detectedItems.push({ name, service, qty, price });
      });
    } else if (typeof document !== 'undefined') {
      // Direct extraction fallback from frontend table rows
      const tableRows = document.querySelectorAll('table tr, .item-row, .cart-item');
      tableRows.forEach((row: any) => {
        const text = row.innerText || '';
        if (text.includes('Total') || text.includes('Action') || text.includes('Price')) return;
        const cells = row.querySelectorAll('td, div, span');
        if (cells.length >= 2) {
          const name = cells[0].innerText ? cells[0].innerText.trim() : '';
          if (name && isNaN(Number(name)) && name.length > 1) {
            detectedItems.push({ name, service: 'DC', qty: 1, price: 0 });
          }
        }
      });
    }

    if (detectedItems.length === 0) {
      detectedItems = [
        { name: 'Shirt', service: 'DC', qty: 1, price: 0 },
        { name: 'Sherwani', service: 'DC', qty: 1, price: 0 },
        { name: 'Coat / Blazer', service: 'DC', qty: 1, price: 0 },
        { name: 'Kurta', service: 'DC', qty: 1, price: 0 }
      ];
    }

    const totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0) || 4;

    let rowsHtml = '';
    detectedItems.forEach((item) => {
      let finalPrice = item.price;
      if (finalPrice === 0 && grossAmount > 0) {
        finalPrice = grossAmount / totalPcs;
      }
      rowsHtml += `
        <tr style="vertical-align: top;">
          <td style="padding: 4px 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            • ${item.name} [${item.service}] x ${item.qty}
          </td>
          <td style="padding: 4px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            ₹${(finalPrice * item.qty).toFixed(2)}
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
// checksum-build-update: 1999291
