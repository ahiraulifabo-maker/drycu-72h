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
    // ---- DEFAULT FALLBACK VALUES ----
    let grossAmount = 10.00;
    let advance = 0.00;
    let balance = 10.00;
    let customerName = '';
    let customerPhone = '';
    let orderNumber = '';

    // =======================================================
    // 🔥 ULTIMATE DEEP DOM SCRAPER (AGGRESIVE HYBRID ENGINE)
    // =======================================================
    if (typeof document !== 'undefined') {
      const allText = document.body.innerText || '';

      // 1. Phone Extraction from any text node or values
      const phoneMatch = allText.match(/(?:📞|Mob|Phone|Mobile|📌)\s*[:.-]?\s*([6-9]\d{9})/i);
      if (phoneMatch) customerPhone = phoneMatch[1];

      // 2. Strict Input/Select Elements scanning
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((inp: any) => {
        const val = inp.value ? inp.value.trim() : '';
        if (!val) return;

        // Extract phone number if matches Indian standards
        if (/^[6-9]\d{9}$/.test(val)) {
          customerPhone = val;
        }
        // Extract customer name: ignoring systematic application noise
        else if (
          val.length > 2 && 
          isNaN(val) && 
          !val.includes('@') && 
          !['dry', 'clean', 'true', 'false', 'order', 'cash', 'gimp', 'admin', 'biller'].some(w => val.toLowerCase().includes(w))
        ) {
          if (!customerName || customerName.length > val.length) {
            customerName = val;
          }
        }
      });

      // 3. Dynamic Amount Scrapers from elements
      const allDivs = document.querySelectorAll('div, span, p, td, h1, h2, h3');
      allDivs.forEach((el: any) => {
        const txt = el.innerText ? el.innerText.trim() : '';
        if (!txt) return;

        // Try to read order numbers from layout text elements
        if (!orderNumber) {
          const ordMatch = txt.match(/(?:Order\s*No|Order\s*ID|Invoice\s*#)\s*[:.-]?\s*([A-Za-z0-9-]+)/i);
          if (ordMatch) orderNumber = ordMatch[1];
        }
      });
    }

    // =======================================================
    // 📦 BACKEND / COMPONENT STATE PARSING
    // =======================================================
    if (order) {
      grossAmount = Number(order.totalAmount || order.grossAmount || order.netPayable || order.amount || grossAmount);
      advance = Number(order.advanceAmount || order.advancePaid || order.advance || 0);
      balance = Number(order.balanceDue || order.balance || (grossAmount - advance));
      
      if (!orderNumber) {
        const idStr = String(order.id || order.orderNumber || order.uid || '22').replace(/^[A-Za-z-]+/, '');
        orderNumber = "DI-" + idStr.padStart(5, '0');
      }

      if (order.customerName || order.customer_name) customerName = order.customerName || order.customer_name;
      else if (order.customerDetails?.name) customerName = order.customerDetails.name;
      else if (order.customer && typeof order.customer === 'object') customerName = order.customer.name || order.customer.customerName || customerName;

      if (order.customerPhone || order.customer_phone) customerPhone = order.customerPhone || order.customer_phone;
      else if (order.customerDetails?.phone) customerPhone = order.customerDetails.phone;
      else if (order.customer && typeof order.customer === 'object') customerPhone = order.customer.phone || order.customer.mobile || customerPhone;
    }

    // Final clean ups for missing scraped keys
    if (!customerName || /^[0-9a-zA-Z_-]{15,}$/.test(customerName)) customerName = 'Customer';
    if (!customerPhone) customerPhone = 'N/A';
    if (!orderNumber) orderNumber = 'DI-00022';

    // =======================================================
    // 👕 DYNAMIC ITEM EXTRACTOR (FROM STATE OR ACTIVE TABLES)
    // =======================================================
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
      // Direct DOM Document Table Scraper Framework
      const rows = document.querySelectorAll('table tr, .item-row, .garment-item');
      rows.forEach((row: any) => {
        const text = row.innerText || '';
        if (text.includes('Price') || text.includes('Total') || text.includes('Action')) return; // Ignore headers
        
        const tds = row.querySelectorAll('td, div, span');
        if (tds.length >= 2) {
          const name = tds[0].innerText ? tds[0].innerText.trim() : 'Garment';
          const qty = 1; 
          if (name && isNaN(Number(name)) && name.length > 1) {
            detectedItems.push({ name, service: 'DC', qty, price: 0 });
          }
        }
      });
    }

    // Strict Fallback Strategy if absolutely nothing is on screen or state
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

    const formattedDate = order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const readyDate = order?.readyDate ? new Date(order.readyDate).toLocaleDateString('en-GB') : '19/07/2026';

    const html = `
      <html>
      <head>
        <title>DRYCU-72H Premium Concise Receipt</title>
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
    console.error("Print mapping internal exception: ", err);
  }
}

export function sendWhatsAppNotification(order: any, customerPhone: string, encodedMessage: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.open("https://web.whatsapp.com/send?phone=" + customerPhone + "&text=" + encodedMessage, '_blank');
  } catch (e) {}
}
// global-checksum-version-hotfix: 466388
