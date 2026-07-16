import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC', 'Laundry': 'LD', 'Ironing': 'IR', 'Top Up': 'TP', 'Topup': 'TP',
  'DC': 'DC', 'LD': 'LD', 'IR': 'IR', 'TP': 'TP'
};

export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  // Tags print logic goes here if needed
}

export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const target = order || (window as any).currentOrder || (window as any).activeOrder || (window as any).lastCreatedOrder || {};
    
    let customerName = target.customerName || target.customerDetails?.name || target.name || '';
    let customerPhone = target.customerPhone || target.customerDetails?.phone || target.phone || '';
    let grossAmount = Number(target.totalAmount || target.grossAmount || target.amount || 0);
    let advance = Number(target.advanceAmount || target.advancePaid || target.advance || 0);
    let orderNumber = target.orderNumber || target.id || '';
    let balance = 0; // Fixed: Declared upfront globally inside the try block

    // 1. DOM SCRAPER FOR INPUT FIELDS & DYNAMIC LABELS
    if (typeof document !== 'undefined') {
      const allText = document.body.innerText || '';

      if (!customerPhone || customerPhone === 'N/A') {
        const phoneMatch = allText.match(/[6-9]\d{9}/);
        if (phoneMatch) customerPhone = phoneMatch[0];
      }

      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((inp: any) => {
        const val = inp.value ? inp.value.trim() : '';
        if (!val) return;

        if (/^\d{10}$/.test(val)) {
          customerPhone = val;
          return;
        }

        const lowerId = (inp.id || '').toLowerCase();
        const lowerName = (inp.name || '').toLowerCase();
        const lowerPlace = (inp.placeholder || '').toLowerCase();
        const attrText = (inp.getAttribute('data-name') || '').toLowerCase();
        const parentText = inp.parentElement ? inp.parentElement.innerText.toLowerCase() : '';

        if (!customerName || customerName.toLowerCase() === 'customer' || customerName.toLowerCase() === 'walk-in customer') {
          if (
            lowerId.includes('name') || lowerName.includes('name') || lowerPlace.includes('name') || 
            lowerId.includes('cust') || lowerName.includes('cust') || lowerPlace.includes('cust') ||
            parentText.includes('name') || parentText.includes('customer') || attrText.includes('name')
          ) {
            if (isNaN(Number(val)) && val.length > 2) {
              customerName = val;
            }
          }
        }
      });

      if (!customerName || customerName.toLowerCase() === 'customer' || customerName.toLowerCase() === 'walk-in customer') {
        const elements = document.querySelectorAll('h1, h2, h3, h4, span, div, p, td, label');
        for (let el of Array.from(elements)) {
          const txt = (el as HTMLElement).innerText || '';
          const match = txt.match(/(?:customer|name|cust|client|ग्राहक)\s*[:|-]\s*([A-Za-z\s]{3,25})/i);
          if (match && match[1] && !match[1].toLowerCase().includes('date') && !match[1].toLowerCase().includes('order')) {
            customerName = match[1].trim();
            break;
          }
        }
      }
    }

    if (!customerName || customerName.toLowerCase() === 'customer') customerName = 'Walk-in Customer';
    if (!customerPhone || customerPhone === 'N/A') customerPhone = '9517498557';
    if (!orderNumber) orderNumber = 'DI-' + String(Math.floor(Math.random() * 90000) + 10000);
    if (!String(orderNumber).startsWith('DI-')) orderNumber = 'DI-' + String(orderNumber).replace(/^[A-Za-z-]+/, '').padStart(5, '0');

    // 2. ITEM DETAILS PARSER
    let detectedItems: Array<{name: string, service: string, qty: number, price: number}> = [];
    const stateItems = target.items || target.garments || [];
    
    if (stateItems.length > 0) {
      stateItems.forEach((item: any) => {
        detectedItems.push({
          name: item.name || item.itemName || 'Garment',
          service: SERVICE_ABBR[item.service] || item.service || 'DC',
          qty: Number(item.qty || item.quantity || 1),
          price: Number(item.price || item.rate || item.amount || 0)
        });
      });
    }

    if (typeof document !== 'undefined') {
      const rows = document.querySelectorAll('table tr, .item-row, .cart-item, tr');
      let domItems: Array<{name: string, service: string, qty: number, price: number}> = [];

      rows.forEach((row: any) => {
        const txt = (row.innerText || '').trim();
        if (!txt || txt.includes('Total') || txt.includes('Gross') || txt.includes('Balance') || txt.includes('Due') || txt.length < 4) return;

        const cells = row.querySelectorAll('td, span, div');
        if (cells.length >= 2) {
          const nameCand = cells[0].innerText ? cells[0].innerText.trim() : '';
          if (nameCand && isNaN(Number(nameCand)) && !['sr', 'no', 'item', 'action', 'price', 'qty', 'service', 'delete'].some(w => nameCand.toLowerCase().includes(w))) {
            
            let rowPrice = 0;
            for (let i = cells.length - 1; i >= 1; i--) {
              const cellText = (cells[i].innerText || '').trim();
              const numMatch = cellText.match(/(\d+(?:\.\d+)?)/);
              if (numMatch) {
                const parsedVal = Number(numMatch[1]);
                if (parsedVal > 0) {
                  rowPrice = parsedVal;
                  break;
                }
              }
            }

            let svc = 'DC';
            if (txt.toLowerCase().includes('laundry')) svc = 'LD';
            else if (txt.toLowerCase().includes('iron')) svc = 'IR';
            else if (txt.toLowerCase().includes('top up') || txt.toLowerCase().includes('topup')) svc = 'TP';

            domItems.push({
              name: nameCand.split('\n')[0],
              service: svc,
              qty: 1,
              price: rowPrice
            });
          }
        }
      });

      if (domItems.length > 0 && domItems.reduce((s, i) => s + i.price, 0) > 0) {
        detectedItems = domItems;
      } else if (detectedItems.length === 0 && domItems.length > 0) {
        detectedItems = domItems;
      }
    }

    if (detectedItems.length === 0) {
      detectedItems = [{ name: 'Garment Processing', service: 'DC', qty: 1, price: grossAmount || 0 }];
    }

    const totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);

    if (grossAmount === 0 && typeof document !== 'undefined') {
      const allText = document.body.innerText || '';
      const grossMatch = allText.match(/(?:Gross|Total|Amount)\s*(?::|₹|\$)?\s*(\d+(?:\.\d+)?)/i);
      if (grossMatch) grossAmount = Number(grossMatch[1]);
    }

    let parsedSum = detectedItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    if (parsedSum > 0) {
      grossAmount = parsedSum;
    }
    
    balance = grossAmount - advance; // Correctly assigned here without breaking

    let rowsHtml = '';
    detectedItems.forEach((item) => {
      rowsHtml += `
        <tr style="vertical-align: top;">
          <td style="padding: 4px 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            • ${item.name} [${item.service}] x ${item.qty}
          </td>
          <td style="padding: 4px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            ₹${item.price.toFixed(2)}
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
// reference-balance-error-fixed-v8: 556677
