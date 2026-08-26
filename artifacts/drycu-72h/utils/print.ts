import { Alert, Image, Platform } from 'react-native';
import * as Print from 'expo-print';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC', 'Laundry': 'LD', 'Ironing': 'IR', 'Top Up': 'TP', 'Topup': 'TP',
  'DC': 'DC', 'LD': 'LD', 'IR': 'IR', 'TP': 'TP'
};

const DRYCU_LOGO_ASSET = require('../assets/images/drycu-logo.jpeg');

function getLogoUri(): string {
  try {
    return Image.resolveAssetSource(DRYCU_LOGO_ASSET)?.uri ?? '';
  } catch {
    return '';
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

export async function printTags(order: any, storeInfo: any): Promise<void> {
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

  try {
    const globalOrder = isWeb
      ? (window as any).currentOrder || (window as any).activeOrder || (window as any).lastCreatedOrder || {}
      : {};
    const selectedCustState = isWeb
      ? (window as any).selectedCustomer || (window as any).currentCustomer || {}
      : {};
    
    const directInfo = extractCustomerDetailsDirectly();
    let customerName = order?.customerName || order?.name || globalOrder?.customerName || selectedCustState?.name || directInfo.name;
    let orderNumber = getSequentialOrderNumber(order || globalOrder);

    if (customerName === 'Walk-in Customer' && directInfo.name !== 'Walk-in Customer') {
      customerName = directInfo.name;
    }

    let detectedItems: Array<{name: string, service: string, qty: number, price: number}> = [];
    const stateItems = order?.items || order?.garments || globalOrder?.items || (isWeb ? (window as any).cartItems : []) || [];
    
    if (Array.isArray(stateItems) && stateItems.length > 0) {
      stateItems.forEach((item: any) => {
        detectedItems.push({
          name: item.name || item.itemName || 'Garment',
          service: SERVICE_ABBR[item.service] || item.service || 'DC',
          qty: Number(item.qty || item.quantity || 1),
          price: Number(item.price !== undefined ? item.price : (item.rate || item.customPrice || 0))
        });
      });
    }

    if (detectedItems.length === 0 && isWeb && typeof document !== 'undefined') {
      const rows = document.querySelectorAll('table tr, tr, .item-row, .cart-item, div[class*="row"], div[class*="item"]');
      rows.forEach((row: any) => {
        const txt = (row.innerText || '').trim();
        if (!txt || ['total', 'gross', 'balance', 'due', 'subtotal', 'item', 'price'].some(w => txt.toLowerCase().includes(w))) return;

        const cells = row.querySelectorAll('td, span, div, input');
        if (cells.length >= 2) {
          let nameCand = '';
          let numericalTokens: number[] = [];

          cells.forEach((c: any) => {
            if (c.tagName === 'INPUT') {
              const val = Number(c.value);
              if (!isNaN(val) && val > 0) numericalTokens.push(val);
            } else {
              const innerT = (c.innerText || '').trim();
              if (!innerT) return;
              if (isNaN(Number(innerT)) && innerT.length > 2 && !['qty', 'rate', 'price', 'service'].some(w => innerT.toLowerCase().includes(w))) {
                if (!nameCand) nameCand = innerT.split('\n')[0];
              } else {
                const num = Number(innerT.replace(/[^\d\.]/g, ''));
                if (!isNaN(num) && num > 0) numericalTokens.push(num);
              }
            }
          });

          if (nameCand && nameCand.length < 30) {
            let qty = numericalTokens.length > 1 ? numericalTokens[0] : 1;
            let svc = 'DC';
            if (txt.toLowerCase().includes('laundry')) svc = 'LD';
            else if (txt.toLowerCase().includes('iron')) svc = 'IR';

            detectedItems.push({ name: nameCand.trim(), service: svc, qty: qty, price: 0 });
          }
        }
      });
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
            <div class="brand">DRYCU-72H</div>
            <div class="order-id">${escapeHtml(orderNumber)}</div>
            <div class="cust-title">${escapeHtml(customerName)}</div>
            <div class="svc-row">
              <span class="svc-code">${item.service}</span>
              <span class="counter-ratio">${currentPieceIndex}/${totalPcs}</span>
            </div>
            <div class="info-row">Ready: ${readyDateStr}</div>
            <div class="info-row">Item: ${escapeHtml(item.name)}</div>
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
          @page { size: 38.1mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          html, body { writing-mode: horizontal-tb; transform: none; }
          html { width: 100%; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 36mm; margin: 0 auto; padding: 3px 2px; background-color: #fff; }
          .tag-wrapper { width: 100%; text-align: left; padding: 2px 0; page-break-inside: avoid; display: block; }
          .brand { font-size: 11px; text-align: center; margin-bottom: 3px; }
          .order-id { font-size: 17px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; }
          .cust-title { font-size: 11px; font-weight: 900; line-height: 1.2; margin-bottom: 3px; overflow-wrap: anywhere; }
          .svc-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; margin-bottom: 3px; width: 100%; }
          .info-row { font-size: 10px; font-weight: 900; line-height: 1.25; margin-bottom: 1px; overflow-wrap: anywhere; }
          .dashed-separator { font-size: 9px; font-weight: 900; white-space: nowrap; margin-top: 4px; margin-bottom: 5px; overflow: hidden; }
        </style>
      </head>
      <body>${tagsHtml}</body>
      </html>
    `;

    if (isWeb) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
      }
    } else {
      await Print.printAsync({
        html,
        width: 144,
        orientation: Print.Orientation.portrait,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    }
  } catch (err) {
    console.error(err);
    if (!isWeb) {
      Alert.alert('Printing unavailable', 'The device could not open its print service. Check that a printer or system print service is available.');
    }
  }
}

export async function printBill(order: any, customer: any, storeInfo: any): Promise<void> {
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

  try {
    const globalOrder = isWeb
      ? (window as any).currentOrder || (window as any).activeOrder || (window as any).lastCreatedOrder || {}
      : {};
    const selectedCustState = isWeb
      ? (window as any).selectedCustomer || (window as any).currentCustomer || {}
      : {};

    const directInfo = extractCustomerDetailsDirectly();
    let customerName = customer?.name || order?.customerName || order?.name || globalOrder?.customerName || selectedCustState?.name || directInfo.name;
    let customerPhone = customer?.mobile || customer?.phone || order?.customerPhone || order?.phone || globalOrder?.customerPhone || selectedCustState?.phone || directInfo.phone;
    let customerAddress = customer?.address || order?.customerAddress || globalOrder?.customerAddress || '';
    let orderNumber = getSequentialOrderNumber(order || globalOrder);

    if (customerName === 'Walk-in Customer' && directInfo.name !== 'Walk-in Customer') {
      customerName = directInfo.name;
    }
    if (!customerPhone && directInfo.phone) {
      customerPhone = directInfo.phone;
    }

    let detectedItems: Array<{name: string, service: string, qty: number, kg: number, price: number}> = [];
    
    // 1. Check if structural app state contains current live items
    const stateItems = order?.items || order?.garments || globalOrder?.items || (isWeb ? (window as any).cartItems : []) || [];
    if (Array.isArray(stateItems) && stateItems.length > 0) {
      stateItems.forEach((item: any) => {
        const qty = Number(item.qty || item.quantity || 1);
        const unitPrice = Number(item.price !== undefined ? item.price : (item.rate || item.ratePerUnit || item.customPrice || 0));
        detectedItems.push({
          name: item.name || item.itemName || 'Garment',
          service: SERVICE_ABBR[item.service] || SERVICE_ABBR[item.serviceType] || item.service || item.serviceType || 'DC',
          qty,
          kg: Number(item.kg || 0),
          price: Number(item.subtotal !== undefined ? item.subtotal : unitPrice * qty)
        });
      });
    }

    if (Array.isArray(order?.topUps)) {
      order.topUps.filter((topUp: any) => Number(topUp.qty) > 0).forEach((topUp: any) => {
        detectedItems.push({
          name: topUp.name || 'Top-Up Service',
          service: 'TP',
          qty: Number(topUp.qty),
          kg: 0,
          price: Number(topUp.subtotal ?? Number(topUp.rate || 0) * Number(topUp.qty))
        });
      });
    }

    // 2. Direct real-time screen extraction to intercept dynamic input/temporary changes
    if (detectedItems.length === 0 && isWeb && typeof document !== 'undefined') {
      const rows = document.querySelectorAll('table tr, tr, .item-row, .cart-item, div[class*="row"], div[class*="item"]');
      rows.forEach((row: any) => {
        const txt = (row.innerText || '').trim();
        if (!txt || ['total', 'gross', 'balance', 'due', 'subtotal', 'item', 'price'].some(w => txt.toLowerCase().includes(w))) return;

        const cells = row.querySelectorAll('td, span, div, input');
        if (cells.length >= 2) {
          let nameCand = '';
          let numericalTokens: number[] = [];

          cells.forEach((c: any) => {
            if (c.tagName === 'INPUT') {
              const val = Number(c.value);
              if (!isNaN(val) && val > 0) numericalTokens.push(val);
            } else {
              const innerT = (c.innerText || '').trim();
              if (!innerT) return;
              if (isNaN(Number(innerT)) && innerT.length > 2 && !['qty', 'rate', 'price', 'service'].some(w => innerT.toLowerCase().includes(w))) {
                if (!nameCand) nameCand = innerT.split('\n')[0];
              } else {
                const num = Number(innerT.replace(/[^\d\.]/g, ''));
                if (!isNaN(num) && num > 0) numericalTokens.push(num);
              }
            }
          });

          if (nameCand && nameCand.length < 30) {
            let detectedPrice = numericalTokens.length > 0 ? numericalTokens[numericalTokens.length - 1] : 0;
            let detectedQty = numericalTokens.length > 1 ? numericalTokens[0] : 1;
            
            let svc = 'DC';
            if (txt.toLowerCase().includes('laundry')) svc = 'LD';
            else if (txt.toLowerCase().includes('iron')) svc = 'IR';

            detectedItems.push({
              name: nameCand.replace(/[^a-zA-Z0-9\s\-\[\]\/]/g, '').trim(),
              service: svc,
              qty: detectedQty,
              kg: 0,
              price: detectedPrice
            });
          }
        }
      });
    }

    // REMOVED ALL HARDCODED FALLBACK ARRAYS TO PREVENT CORRUPTING SYSTEM PRICES
    let grossAmount = Number(order?.grossAmount ?? globalOrder?.grossAmount ?? detectedItems.reduce((acc, curr) => acc + curr.price, 0));
    let discountAmount = Number(order?.discountAmount ?? globalOrder?.discountAmount ?? 0);
    let netPayable = Number(order?.netPayable ?? globalOrder?.netPayable ?? (grossAmount - discountAmount));
    let advance = Number(order?.advancePaid ?? order?.advanceAmount ?? globalOrder?.advancePaid ?? globalOrder?.advanceAmount ?? 0);
    let balance = netPayable - advance;
    let totalPcs = detectedItems.reduce((acc, curr) => acc + curr.qty, 0);
    let totalKg = detectedItems.reduce((acc, curr) => acc + curr.kg, 0);

    let rowsHtml = '';
    detectedItems.forEach((item) => {
      rowsHtml += `
        <tr style="vertical-align: top;">
          <td style="padding: 3px 0; font-size: 10px;">${item.kg > 0 ? item.kg.toFixed(3) : '-'}</td>
          <td style="padding: 3px 0; font-size: 10px;">${item.qty > 0 ? item.qty : '-'}</td>
          <td style="padding: 3px 0; font-size: 10px;">${escapeHtml(item.service)}</td>
          <td style="padding: 3px 0; text-align: right; font-size: 10px;">₹${item.price.toFixed(2)}</td>
        </tr>
      `;
    });

    const logoUri = getLogoUri();
    const formattedDate = new Date(order?.createdAt || Date.now()).toLocaleDateString('en-GB');
    const readyDate = new Date(order?.pickupDeadline || Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
    const store = storeInfo || {};
    const logoHtml = logoUri ? `<img class="store-logo" src="${escapeHtml(logoUri)}" alt="DRYCU-72H logo">` : '';

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Invoice</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; font-weight: 900 !important; color: #000 !important; margin: 0; padding: 0; }
          html, body { writing-mode: horizontal-tb; transform: none; }
          html { width: 100%; margin: 0; padding: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 74mm; margin: 0 auto; padding: 5px 4px; font-size: 11px; line-height: 1.25; background-color: #fff; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .line { border-top: 2px solid #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 3px; }
          td { color: #000; font-weight: 900; }
          .store-header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
          .store-logo { width: 27mm; height: 27mm; object-fit: contain; display: block; margin: 0 auto 3px; }
          .store-name { font-size: 17px; letter-spacing: 0.7px; }
          .store-address { font-size: 10px; line-height: 1.25; }
          .store-contact { font-size: 10px; }
          .tagline { font-size: 9px; margin-top: 2px; font-weight: 900; }
          .order-card { border: 2px solid #000; padding: 4px; margin: 5px 0; }
          .order-card div { margin-bottom: 2px; }
          .section-title { border-bottom: 2px solid #000; padding: 2px 0; margin-top: 5px; font-size: 11px; letter-spacing: 0.6px; }
          .tc-section { font-size: 10px; text-align: left; margin-top: 4px; line-height: 1.3; font-weight: 900; }
          .summary-box { border: 2px solid #000; padding: 4px; margin-top: 5px; }
          .summary-table td { padding: 2px 0; }
          .balance-row td { border-top: 2px solid #000; padding-top: 4px; font-size: 14px; }
          .items-table { border-top: 2px solid #000; border-bottom: 2px solid #000; }
          .items-table th { border-bottom: 2px solid #000; padding: 3px 0; font-size: 10px; text-align: left; }
          .items-table th:last-child, .items-table td:last-child { text-align: right; }
        </style>
      </head>
      <body>
        <div class="store-header">
          ${logoHtml}
          <div class="center bold store-name">${escapeHtml(store.name || 'DRYCU-72H')}</div>
          <div class="center store-address">${escapeHtml(store.line1 || '')}<br>${escapeHtml(store.line2 || '')}</div>
          <div class="center store-contact">Contact: ${escapeHtml(store.contact || '')}</div>
          <div class="center tagline">${escapeHtml(store.tagline || 'Clean. Fast. You.')}</div>
        </div>
        <div class="order-card">
          <div class="bold" style="font-size: 15px;">${escapeHtml(orderNumber)}</div>
          <div style="font-size: 11px;"><b>Customer:</b> ${escapeHtml(customerName)}</div>
          <div style="font-size: 11px;"><b>Mobile:</b> ${escapeHtml(customerPhone)}</div>
          ${customerAddress ? `<div style="font-size: 10px;"><b>Address:</b> ${escapeHtml(customerAddress)}</div>` : ''}
          <div style="font-size: 10px;"><b>Place of Supply:</b> ${escapeHtml(store.placeOfSupply || '')}</div>
          <div style="font-size: 10.5px;"><b>DATE:</b> ${formattedDate} | <b>RDY:</b> ${readyDate}</div>
        </div>
        <div class="section-title">ITEM DETAILS</div>
        <table class="items-table"><thead><tr><th>KG</th><th>Qty</th><th>Service</th><th>INR</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        <div class="summary-box">
          <table class="summary-table" style="font-size: 11px;">
             <tr><td>T.KG</td><td style="text-align: right;">${totalKg.toFixed(3)}</td></tr>
             <tr><td>TOTAL PCS</td><td style="text-align: right;">${totalPcs} Pcs</td></tr>
             <tr><td>GROSS AMT</td><td style="text-align: right;">₹${grossAmount.toFixed(2)}</td></tr>
              ${discountAmount > 0 ? `<tr><td>DISCOUNT</td><td style="text-align: right;">-₹${discountAmount.toFixed(2)}</td></tr>` : ''}
             <tr><td>ADV PAID</td><td style="text-align: right;">₹${advance.toFixed(2)}</td></tr>
             <tr class="balance-row">
                <td>BAL. AMT.</td>
               <td style="text-align: right;">₹${balance.toFixed(2)}</td>
             </tr>
           </table>
        </div>
        <div class="line"></div>
        <div class="section-title center">TERMS & CONDITIONS</div>
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

    if (isWeb) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
      }
    } else {
      await Print.printAsync({
        html,
        width: 302,
        orientation: Print.Orientation.portrait,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    }
  } catch (err) {
    console.error(err);
    if (!isWeb) {
      Alert.alert('Printing unavailable', 'The device could not open its print service. Check that a printer or system print service is available.');
    }
  }
}

export function sendWhatsAppNotification(order: any, customerPhone: string, encodedMessage: string) {}
// real-workflow-v24: 994411
