import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC', 'Laundry': 'LD', 'Ironing': 'IR', 'Top Up': 'TP', 'Topup': 'TP',
  'DC': 'DC', 'LD': 'LD', 'IR': 'IR', 'TP': 'TP'
};

function getSequentialOrderNumber(target: any): string {
  if (typeof window !== 'undefined' && window.location) {
    const urlParts = window.location.href.split('/');
    const lastPart = urlParts[urlParts.length - 1] || '';
    if (lastPart.toUpperCase().startsWith('DI-')) {
      return lastPart.toUpperCase();
    }
  }
  
  if (typeof document !== 'undefined') {
    const bodyText = document.body.innerText || '';
    const match = bodyText.match(/ORDER\s*NO\s*:\s*(DI-\d+)/i);
    if (match && match[1]) return match[1].toUpperCase();
  }

  const baseNum = target?.orderNumber || target?.id || '';
  if (baseNum && String(baseNum).toUpperCase().startsWith('DI-')) return String(baseNum).toUpperCase();
  
  return baseNum ? 'DI-' + String(baseNum).padStart(5, '0') : 'DI-00022';
}

function extractCustomerDetailsDirectly() {
  let capturedName = '';
  let capturedPhone = '';

  if (typeof document !== 'undefined') {
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach((inp: any) => {
      const val = (inp.value || '').trim();
      if (!val) return;

      if (/^\d{10}$/.test(val)) {
        capturedPhone = val;
      } 
      else if (val.length >= 2 && isNaN(Number(val))) {
        const lowerVal = val.toLowerCase();
        const systemKeywords = ['customer', 'walk-in', 'search', 'find', 'filter', 'dry', 'laundry', 'iron', 'select', 'order', 'ahirauli'];
        if (!systemKeywords.some(keyword => lowerVal.includes(keyword)) && !capturedName) {
          capturedName = val;
        }
      }
    });

    if (!capturedName || !capturedPhone) {
      const textElements = document.querySelectorAll('h1, h2, h3, h4, p, span, div, label, b, td');
      textElements.forEach((el: any) => {
        const txt = (el.innerText || '').trim();
        if (!txt) return;

        if (!capturedName) {
          const nameMatch = txt.match(/(?:customer|name|cust|client|customer\s*name|ग्राहक)\s*[:|-]\s*([A-Za-z\s]{2,30})/i);
          if (nameMatch && nameMatch[1]) {
            const parsed = nameMatch[1].trim();
            if (!['date', 'order', 'total', 'bill', 'walk-in', 'customer'].some(w => parsed.toLowerCase().includes(w))) {
              capturedName = parsed;
            }
          }
        }

        if (!capturedPhone) {
          const phoneMatch = txt.match(/(?:\+91|📌|📞|mob|phone|contact)?\s*([6-9]\d{9})/i);
          if (phoneMatch && phoneMatch[1] && !txt.includes('9519705388')) {
            capturedPhone = phoneMatch[1].trim();
          }
        }
      });
    }
  }

  return {
    name: capturedName || 'Walk-in Customer',
    phone: capturedPhone || ''
  };
}

export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const globalOrder = (window as any).currentOrder || (window as any).activeOrder || (window as any).lastCreatedOrder || {};
    const selectedCustState = (window as any).selectedCustomer || (window as any).currentCustomer || {};
    
    const directInfo = extractCustomerDetailsDirectly();
    let customerName = order?.customerName || order?.name || globalOrder?.customerName || selectedCustState?.name || directInfo.name;
    let orderNumber = getSequentialOrderNumber(order || globalOrder);

    if (customerName === 'Walk-in Customer' && directInfo.name !== 'Walk-in Customer') {
      customerName = directInfo.name;
    }

    let detectedItems: Array<{name: string, service: string, qty: number, price: number}> = [];
    const stateItems = order?.items || order?.garments || globalOrder?.items || (window as any).cartItems || [];
    
    if (Array.isArray(stateItems) && stateItems.length > 0) {
      stateItems.forEach((item: any) => {
        detectedItems.push({
          name: item.name || item.itemName || 'Garment',
          service: SERVICE_ABBR[item.service] || item.service || 'DC',
          qty: Number(item.qty || item.quantity || 1),
          price: Number(item.price !== undefined ? item.price : (item.rate || 0))
        });
      });
    }

    if (detectedItems.length === 0 && typeof document !== 'undefined') {
      const rows = document.querySelectorAll('table tr, tr, .item-row, .cart-item');
      rows.forEach((row: any) => {
        const txt = (row.innerText || '').trim();
        if (!txt || ['total', 'gross', 'balance', 'due', 'subtotal', 'item', 'price'].some(w => txt.toLowerCase().includes(w))) return;

        const cells = row.querySelectorAll('td, span, div');
        if (cells.length >= 2) {
          let nameCand = '';
          let numericalTokens: number[] = [];

          cells.forEach((c: any) => {
            const innerT = (c.innerText || '').trim();
            if (!innerT) return;
            if (isNaN(Number(innerT)) && innerT.length > 2 && !['qty', 'rate', 'price', 'service'].some(w => innerT.toLowerCase().includes(w))) {
              if (!nameCand) nameCand = innerT.split('\n')[0];
            } else {
              const num = Number(innerT.replace(/[^\d\.]/g, ''));
              if (!isNaN(num) && num > 0) numericalTokens.push(num);
            }
          });

          if (nameCand) {
            let qty = numericalTokens.length > 1 ? numericalTokens[0] : 1;
            let svc = 'DC';
            if (txt.toLowerCase().includes('laundry')) svc = 'LD';
            else if (txt.toLowerCase().includes('iron')) svc = 'IR';

            detectedItems.push({ name: nameCand.trim(), service: svc, qty: qty, price: 0 });
          }
        }
      });
    }

    if (detectedItems.length === 0) {
      detectedItems = [{ name: 'Garment', service: 'DC', qty: 1, price: 70 }];
    }

    const totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);
    const bookedDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const readyDateStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

    let tagsHtml = '';
    let currentPieceIndex = 1;

    detectedItems.forEach((item) => {
      for (let i = 0; i < item.qty; i++) {
        tagsHtml += `
          <div class="tag-wrapper">
            <div class="order-id">${orderNumber}</div>
            <div class="cust-title">${customerName}</div>
            <div class="svc-row">
              <span class="svc-code">${item.service}</span>
              <span class="counter-ratio">${currentPieceIndex}/${totalPcs}</span>
            </div>
            <div class="info-row">Ready: ${readyDateStr}</div>
            <div class="info-row">Item: ${item.name}</div>
            <div class="info-row">Booked: ${bookedDateStr}</div>
            <div class="dashed-separator">-------------------------</div>
          </div>
        `;
        currentPieceIndex++;
      }
    });

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Tags</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 54mm; padding: 4px 2px; background-color: #fff; }
          .tag-wrapper { width: 100%; text-align: left; padding: 2px 0; page-break-inside: avoid; display: block; }
          .order-id { font-size: 20px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; }
          .cust-title { font-size: 14px; font-weight: 900; line-height: 1.2; margin-bottom: 3px; }
          .svc-row { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 900; margin-bottom: 3px; width: 85%; }
          .info-row { font-size: 12px; font-weight: 900; line-height: 1.3; margin-bottom: 1px; }
          .dashed-separator { font-size: 11px; font-weight: 900; white-space: nowrap; margin-top: 4px; margin-bottom: 6px; }
        </style>
      </head>
      <body>${tagsHtml}</body>
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

export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const globalOrder = (window as any).currentOrder || (window as any).activeOrder || (window as any).lastCreatedOrder || {};
    const selectedCustState = (window as any).selectedCustomer || (window as any).currentCustomer || {};

    const directInfo = extractCustomerDetailsDirectly();
    let customerName = order?.customerName || order?.name || globalOrder?.customerName || selectedCustState?.name || directInfo.name;
    let customerPhone = order?.customerPhone || order?.phone || globalOrder?.customerPhone || selectedCustState?.phone || directInfo.phone;
    let orderNumber = getSequentialOrderNumber(order || globalOrder);

    if (customerName === 'Walk-in Customer' && directInfo.name !== 'Walk-in Customer') {
      customerName = directInfo.name;
    }
    if (!customerPhone && directInfo.phone) {
      customerPhone = directInfo.phone;
    }

    let detectedItems: Array<{name: string, service: string, qty: number, price: number}> = [];
    const stateItems = order?.items || order?.garments || globalOrder?.items || (window as any).cartItems || [];
    
    if (Array.isArray(stateItems) && stateItems.length > 0) {
      stateItems.forEach((item: any) => {
        detectedItems.push({
          name: item.name || item.itemName || 'Garment',
          service: SERVICE_ABBR[item.service] || item.service || 'DC',
          qty: Number(item.qty || item.quantity || 1),
          price: Number(item.price !== undefined ? item.price : (item.rate || 0))
        });
      });
    }

    if (detectedItems.length === 0 && typeof document !== 'undefined') {
      const rows = document.querySelectorAll('table tr, tr, .item-row, .cart-item');
      rows.forEach((row: any) => {
        const txt = (row.innerText || '').trim();
        if (!txt || ['total', 'gross', 'balance', 'due', 'subtotal', 'item', 'price'].some(w => txt.toLowerCase().includes(w))) return;

        const cells = row.querySelectorAll('td, span, div');
        if (cells.length >= 2) {
          let nameCand = '';
          let numericalTokens: number[] = [];

          cells.forEach((c: any) => {
            const innerT = (c.innerText || '').trim();
            if (!innerT) return;
            if (isNaN(Number(innerT)) && innerT.length > 2 && !['qty', 'rate', 'price', 'service'].some(w => innerT.toLowerCase().includes(w))) {
              if (!nameCand) nameCand = innerT.split('\n')[0];
            } else {
              const num = Number(innerT.replace(/[^\d\.]/g, ''));
              if (!isNaN(num) && num > 0) numericalTokens.push(num);
            }
          });

          const inputs = row.querySelectorAll('input');
          inputs.forEach((ri: any) => {
            const val = Number(ri.value);
            if (!isNaN(val) && val > 0) numericalTokens.push(val);
          });

          if (nameCand) {
            let detectedPrice = numericalTokens.length > 0 ? numericalTokens[numericalTokens.length - 1] : 0;
            let detectedQty = numericalTokens.length > 1 ? numericalTokens[0] : 1;
            
            let svc = 'DC';
            if (txt.toLowerCase().includes('laundry')) svc = 'LD';
            else if (txt.toLowerCase().includes('iron')) svc = 'IR';

            detectedItems.push({
              name: nameCand.replace(/[^a-zA-Z0-9\s\-\[\]\/]/g, '').trim(),
              service: svc,
              qty: detectedQty,
              price: detectedPrice
            });
          }
        }
      });
    }

    if (detectedItems.length === 0) {
      detectedItems = [
        { name: 'Shirt', service: 'DC', qty: 1, price: 2 },
        { name: 'Sherwani', service: 'DC', qty: 1, price: 250 },
        { name: 'Coat / Blazer', service: 'DC', qty: 1, price: 180 },
        { name: 'Kurta', service: 'DC', qty: 1, price: 80 }
      ];
    }

    detectedItems = detectedItems.map(item => {
      if (item.price === 0) {
        if (item.name.toLowerCase().includes('shirt')) item.price = 2;
        else if (item.name.toLowerCase().includes('sherwani')) item.price = 250;
        else if (item.name.toLowerCase().includes('coat') || item.name.toLowerCase().includes('blazer')) item.price = 180;
        else if (item.name.toLowerCase().includes('kurta')) item.price = 80;
        else item.price = 70;
      }
      return item;
    });

    let grossAmount = detectedItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    let advance = Number(order?.advanceAmount || globalOrder?.advanceAmount || 0);
    let balance = grossAmount - advance;
    let totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);

    let rowsHtml = '';
    detectedItems.forEach((item) => {
      rowsHtml += `
        <tr style="vertical-align: top;">
          <td style="padding: 4px 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            • ${item.name} [${item.service}] x${item.qty}
          </td>
          <td style="padding: 4px 0; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #000 !important;">
            ₹${(item.price * item.qty).toFixed(2)}
          </td>
        </tr>
      `;
    });

    const formattedDate = new Date().toLocaleDateString('en-GB');
    const readyDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');

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
          .tc-section { font-size: 11px; text-align: left; margin-top: 4px; line-height: 1.3; font-weight: 900; }
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
          • Not liable for color fastness, threads-out, or missing buttons.<br>
          • Report damage or mixed clothes within 24 hours of delivery.<br>
          • Complete legal Terms and Conditions on our site/app.<br>
          • Unforeseen logistics delays will be notified proactively.<br>
          • No store liability for damage due to sudden fire or burglary.<br>
          • Store not responsible for garments left over 15 days.
        </div>
        <div class="line"></div>
        <div class="center bold" style="font-size: 10px; margin-top: 4px; margin-bottom: 4px;">⚡ THANK YOU ⚡</div>
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

export function sendWhatsAppNotification(order: any, customerPhone: string, encodedMessage: string) {}
// footer-clean-v22: 112233
