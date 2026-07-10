import { Platform } from 'react-native';
import { Order, Customer } from '@/types';
import { StoreInfoData } from '@/context/AppContext';

const SERVICE_ABBR: Record<string, string> = {
  'Laundry': 'LAU',
  'Dry Cleaning': 'DC',
  'Simple Press': 'SP',
  'Steam Press': 'STP',
};

function openPrintWindow(html: string) {
  if (Platform.OS !== 'web') return;
  const win = window.open('', '_blank', 'width=600,height=800');
  if (!win) {
    alert('Please allow popups for this site to enable printing.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

// ── TAG PRINT (58mm narrow label printer) ──────────────────────────────────
// Prints ONE tag per garment line item in the order.
// Each tag: DI Number  |  Garment Name  |  Service
// ──────────────────────────────────────────────────────────────────────────

export function printTags(order: Order, storeInfo: StoreInfoData) {
  if (Platform.OS !== 'web') return;

  const tagBlocks = order.items.map((item) => {
    const service = SERVICE_ABBR[item.serviceType] ?? item.serviceType;
    const detail = [
      item.kg > 0 ? `${item.kg} KG` : '',
      item.qty > 0 ? `Qty: ${item.qty}` : '',
    ].filter(Boolean).join('  ·  ');

    return `
      <div class="tag">
        <div class="store">${storeInfo.name}</div>
        <div class="di">${order.id}</div>
        <div class="divider"></div>
        <div class="garment">${item.itemName}</div>
        <div class="service">${service}</div>
        ${detail ? `<div class="detail">${detail}</div>` : ''}
        <div class="divider"></div>
        <div class="footer">${storeInfo.timing}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tags – ${order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* 58mm label paper — browser print units */
    @page {
      size: 58mm auto;
      margin: 2mm;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      width: 54mm;
      background: #fff;
      color: #000;
    }

    .tag {
      width: 54mm;
      padding: 2mm 3mm;
      page-break-after: always;
      text-align: center;
    }

    .tag:last-child {
      page-break-after: avoid;
    }

    .store {
      font-size: 7pt;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 2mm;
    }

    .di {
      font-size: 22pt;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 1mm;
    }

    .divider {
      border-top: 1px dashed #999;
      margin: 2mm 0;
    }

    .garment {
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 1mm;
      line-height: 1.2;
    }

    .service {
      font-size: 10pt;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #333;
      margin-bottom: 1mm;
    }

    .detail {
      font-size: 8pt;
      color: #555;
    }

    .footer {
      font-size: 7pt;
      color: #888;
      margin-top: 1mm;
    }
  </style>
</head>
<body>
  ${tagBlocks}
</body>
</html>`;

  openPrintWindow(html);
}

// ── BILL PRINT (80mm thermal printer) ──────────────────────────────────────

export function printBill(order: Order, customer: Customer | undefined, storeInfo: StoreInfoData) {
  if (Platform.OS !== 'web') return;

  const pickup = new Date(order.pickupDeadline);
  const created = new Date(order.createdAt);
  const totalKg = order.items.reduce((s, i) => s + (i.kg || 0), 0);
  const advance = order.advancePaid ?? 0;
  const balAmt = order.netPayable - advance;

  const itemRows = order.items.map(item => {
    const service = SERVICE_ABBR[item.serviceType] ?? item.serviceType;
    return `
      <tr>
        <td>${item.kg > 0 ? item.kg.toFixed(3) : '-'}</td>
        <td class="center">${item.qty > 0 ? item.qty : '-'}</td>
        <td>
          <div class="item-name">${item.itemName}</div>
          <div class="item-svc">${service}</div>
        </td>
        <td class="right">${item.subtotal.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const topUpRows = (order.topUps ?? []).filter(t => t.qty > 0).map(t => `
    <tr>
      <td>-</td>
      <td class="center">${t.qty}</td>
      <td>${t.name}</td>
      <td class="right">${t.subtotal.toFixed(2)}</td>
    </tr>`).join('');

  const topUpSection = topUpRows ? `
    <tr><td colspan="4" class="section-label">Top-Up Services</td></tr>
    ${topUpRows}` : '';

  const discountRow = order.discountAmount > 0 ? `
    <tr class="summary-row">
      <td colspan="2"></td>
      <td class="right-label">Discount</td>
      <td class="right">-${order.discountAmount.toFixed(2)}</td>
    </tr>` : '';

  const TERMS = [
    `#1. DRYCU-72H is not liable for color fastness, threads-out, missing buttons, or any other damages.`,
    `#2. Report damages, missing items, or exchanged clothes to DRYCU-72H within 24 hours of delivery.`,
    `#3. Refer to our website (${storeInfo.website}) for complete Terms and Conditions.`,
    `#4. We aim for on-time delivery, but if delays occur due to unforeseen circumstances, we'll keep you updated.`,
    `#5. We accept no liability for any loss or damage arising due to washing, fire, burglary etc.`,
  ].map(t => `<p class="term">${t}</p>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Bill – ${order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: 80mm auto;
      margin: 3mm 2mm;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      width: 76mm;
      background: #fff;
      color: #000;
      font-size: 8pt;
      line-height: 1.4;
    }

    .center { text-align: center; }
    .right  { text-align: right; }

    /* Header */
    .header { text-align: center; margin-bottom: 2mm; }
    .logo-box {
      display: inline-flex; align-items: center; justify-content: center;
      width: 8mm; height: 8mm; border: 2px solid #000; font-size: 12pt;
      font-weight: 900; margin-bottom: 1mm;
    }
    .store-name { font-size: 11pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .store-addr { font-size: 7pt; color: #444; margin-top: 0.5mm; }
    .store-tagline { font-size: 7pt; font-style: italic; color: #666; margin-top: 1mm; }

    /* Divider */
    .div { border-top: 1px solid #999; margin: 2mm 0; }
    .div-dashed { border-top: 1px dashed #bbb; margin: 2mm 0; }

    /* DI + customer */
    .di { font-size: 18pt; font-weight: 900; letter-spacing: 1px; }
    .cust-name { font-size: 9pt; font-weight: 700; margin-top: 1mm; }
    .cust-detail { font-size: 7pt; color: #444; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin: 1mm 0; }
    th { font-size: 7pt; font-weight: 700; text-transform: uppercase;
         border-bottom: 1px solid #999; padding-bottom: 1mm; text-align: left; }
    th.center { text-align: center; }
    th.right { text-align: right; }
    td { font-size: 7.5pt; padding: 1mm 0; vertical-align: top; }
    td.center { text-align: center; }
    td.right { text-align: right; }
    td.right-label { text-align: right; color: #555; }

    .item-name { font-weight: 700; }
    .item-svc { font-size: 6.5pt; color: #666; text-transform: uppercase; }
    .section-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase;
                     color: #666; padding-top: 2mm; }

    /* Summary */
    .summary-row td { padding: 0.5mm 0; }
    .total-row td { font-weight: 900; font-size: 9pt; border-top: 1px solid #000;
                    padding-top: 1.5mm; }
    .bal-row td { font-weight: 900; }

    /* Footer info */
    .info-line { font-size: 7.5pt; margin: 0.5mm 0; }
    .info-label { font-weight: 700; }

    /* Terms */
    .terms-title { font-size: 8pt; font-weight: 700; margin: 1mm 0 0.5mm; }
    .term { font-size: 6.5pt; color: #444; margin-bottom: 1mm; line-height: 1.3; }

    /* Signature */
    .sig-row { display: flex; justify-content: space-between; margin-top: 4mm; }
    .sig-box { width: 45%; text-align: center; }
    .sig-line { border-top: 1px solid #000; margin-bottom: 1mm; }
    .sig-label { font-size: 7.5pt; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="logo-box">✕</div><br/>
    <div class="store-name">${storeInfo.name}</div>
    <div class="store-addr">${storeInfo.line1}</div>
    <div class="store-addr">${storeInfo.line2}</div>
    <div class="store-addr">Contact: ${storeInfo.contact}</div>
    <div class="store-tagline">${storeInfo.tagline}</div>
  </div>

  <div class="div"></div>

  <!-- DI + Customer -->
  <div class="di">${order.id}</div>
  <div class="cust-name">${customer?.name ?? 'N/A'}</div>
  ${customer?.mobile ? `<div class="cust-detail">${customer.address ?? customer.mobile}(${customer.mobile})</div>` : ''}
  <div class="cust-detail">Place of Supply- ${storeInfo.placeOfSupply}</div>
  <div class="cust-detail">${created.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>

  <div class="div"></div>

  <!-- Items table -->
  <table>
    <thead>
      <tr>
        <th style="width:18mm">KG</th>
        <th class="center" style="width:10mm">Qty</th>
        <th>Service</th>
        <th class="right" style="width:16mm">INR</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${topUpSection}
    </tbody>
  </table>

  <div class="div"></div>

  <!-- Totals -->
  <table>
    <tbody>
      <tr class="summary-row">
        <td style="width:18mm">T.KG ${totalKg.toFixed(3)}</td>
        <td class="center" style="width:10mm"></td>
        <td class="right-label">G Amt.</td>
        <td class="right" style="width:16mm">${order.grossAmount.toFixed(2)}</td>
      </tr>
      ${discountRow}
      <tr class="summary-row">
        <td colspan="2"></td>
        <td class="right-label">Adv</td>
        <td class="right">${advance.toFixed(2)}</td>
      </tr>
      <tr class="bal-row">
        <td colspan="2"></td>
        <td class="right-label" style="font-weight:900">Bal.Amt.</td>
        <td class="right" style="font-weight:900">${balAmt.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="div"></div>

  <!-- Footer info -->
  <div class="info-line"><span class="info-label">Ready On:</span> ${
    pickup.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
  } ${pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
  ${order.bookedBy ? `<div class="info-line"><span class="info-label">Booked By :</span> ${order.bookedBy}</div>` : ''}
  <div class="info-line">Advance balance: ${advance.toFixed(0)}</div>
  <div class="info-line">Store Timing ${storeInfo.timing}</div>

  <div class="div-dashed"></div>
  <div class="div-dashed"></div>

  <!-- Terms -->
  <div class="terms-title">Terms and Conditions</div>
  ${TERMS}

  <div class="div"></div>

  <!-- Signature -->
  <div style="text-align:center;font-size:7.5pt;margin-bottom:2mm;">Signature</div>
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Customer</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Salesman</div>
    </div>
  </div>

</body>
</html>`;

  openPrintWindow(html);
}
