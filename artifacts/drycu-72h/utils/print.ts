import { Platform } from 'react-native';

const SERVICE_ABBR: Record<string, string> = {
  'Dry Cleaning': 'DC',
  'Laundry': 'LD',
  'Ironing': 'IR',
};

function openPrintWindow(htmlContent: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(htmlContent);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

export function printTags(order: any, storeInfo: any) {
  if (Platform.OS !== 'web') return;

  let tagBlocks = '';
  order.items.forEach((item: any) => {
    const service = SERVICE_ABBR[item.serviceType] || item.serviceType;
    const totalQty = item.qty || 1;

    for (let i = 1; i <= totalQty; i++) {
      tagBlocks += `
        <div class="tag" style="padding: 6px; margin-bottom: 20px; border-bottom: 3px dashed #000000; text-align: center; page-break-inside: avoid;">
          <div class="store" style="font-weight: 900; color: #000000; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Arial Black', Gadget, sans-serif;">${storeInfo.name}</div>
          <div class="dt" style="font-weight: 900; color: #000000; font-size: 18px; border: 3px solid #000000; display: inline-block; padding: 2px 8px; margin: 6px 0; font-family: 'Arial Black', Gadget, sans-serif;">TAG NO: ${order.id} (${i}/${totalQty})</div>
          <div style="border-top: 2px solid #000000; margin: 5px 0;"></div>
          <div class="garment" style="font-weight: 900; color: #000000; font-size: 17px; text-align: left; font-family: 'Arial Black', sans-serif;">Item: ${item.itemName}</div>
          <div class="service" style="font-weight: 900; color: #000000; font-size: 16px; text-align: left; margin-top: 4px; font-family: 'Arial Black', sans-serif;">Service: ${service}</div>
        </div>
      `;
    }
  });

  const html = <html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } body { font-family: 'Arial Black', Arial, sans-serif; width: 58mm; margin: 0; padding: 3px; color: #000000; -webkit-print-color-adjust: exact; }</style></head><body>${tagBlocks}</body></html>;
  openPrintWindow(html);
}

export function sendWhatsAppNotification(order: any, customerPhone: string, encodedMessage: string) {
  if (Platform.OS !== 'web') return;
  const whatsappUrl = https://web.whatsapp.com/send?phone=${customerPhone}&text=${encodedMessage};
  window.open(whatsappUrl, '_blank');
}
