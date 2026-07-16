import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = { 'Dry Cleaning': 'DC', 'Laundry': 'LD', 'Ironing': 'IR' };

export function printBill(order: any, storeInfo: any) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    let grossAmount = 10.00, advance = 0.00, balance = 10.00;
    let customerName = 'Customer', customerPhone = 'N/A', orderNumber = 'DI-00022';

    // 1. Order State Parsing
    if (order) {
      grossAmount = Number(order.totalAmount || order.grossAmount || order.amount || 0);
      advance = Number(order.advanceAmount || order.advancePaid || 0);
      balance = grossAmount - advance;
      orderNumber = "DI-" + String(order.id || order.orderNumber || '00022').slice(-5);
      if (order.customerName) customerName = order.customerName;
      if (order.customerPhone) customerPhone = order.customerPhone;
    }

    // 2. ULTRA-ROBUST DOM SCRAPER (Look for labels)
    if (typeof document !== 'undefined') {
      const allText = document.body.innerText;
      
      // Get Phone
      const phoneMatch = allText.match(/[6-9]\d{9}/);
      if (phoneMatch) customerPhone = phoneMatch[0];

      // Get Name by looking for elements containing "Name" or "Customer"
      const labels = document.querySelectorAll('div, span, p, label');
      for (let el of Array.from(labels)) {
        const txt = (el as HTMLElement).innerText || '';
        if (txt.toLowerCase().includes('customer') || txt.toLowerCase().includes('name:')) {
           // Assume the next sibling or text node holds the value
           const next = (el as HTMLElement).nextElementSibling as HTMLElement;
           if (next && next.innerText && next.innerText.length > 2 && next.innerText.length < 30) {
             customerName = next.innerText.trim();
             break;
           } else if (txt.includes(':')) {
             customerName = txt.split(':')[1].trim();
             break;
           }
        }
      }
    }

    // 3. Garment Parsing
    let detectedItems: Array<any> = [];
    const items = order?.items || [];
    if (items.length > 0) {
      items.forEach((i: any) => detectedItems.push({ name: i.name || 'Garment', qty: i.qty || 1, price: i.price || 0 }));
    } else {
       detectedItems = [{ name: 'Garment Piece', qty: 1, price: grossAmount }];
    }

    const rowsHtml = detectedItems.map(i => `
      <tr><td style="padding: 4px 0;">• ${i.name} x ${i.qty}</td>
      <td style="text-align: right;">₹${(i.price * i.qty).toFixed(2)}</td></tr>`).join('');

    const html = `<html><body>
      <div style="text-align:center; font-family:Courier;">
        <div style="font-size:18px;"><b>DRYCU-72H</b></div>
        <div style="font-size:12px;">AHIRAULI | 9519705388</div>
        <hr>
        <div style="text-align:left; font-size:14px;">
          <b>ORD:</b> ${orderNumber}<br>
          <b>CUST:</b> ${customerName}<br>
          <b>MOB:</b> ${customerPhone}
        </div>
        <hr>
        <table style="width:100%; font-size:12px;">${rowsHtml}</table>
        <hr>
        <div style="text-align:right; font-size:14px;">
          <b>DUE BAL: ₹${balance.toFixed(2)}</b>
        </div>
      </div>
      <script>window.print(); window.close();</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  } catch (e) { console.error(e); }
}
