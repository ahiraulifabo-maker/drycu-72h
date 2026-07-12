import { Platform } from 'react-native';
import { Order } from '@/types';
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
  setTimeout(() => { win.print(); win.close(); }, 400);
}

export function printTags(order: Order, storeInfo: StoreInfoData) {
  if (Platform.OS !== 'web') return;

  let tagBlocks = '';
  order.items.forEach(item => {
    const service = SERVICE_ABBR[item.serviceType] ?? item.serviceType;
    const totalQty = item.qty || 1;

    for (let i = 1; i <= totalQty; i++) {
      tagBlocks += `
        <div class="tag" style="padding: 6px; margin-bottom: 20px; border-bottom: 3px dashed #000000; text-align: center; page-break-inside: avoid;">
          <!-- LOGO PLACEHOLDER (Agar logo image ho toh src mein link daal sakte hain) -->
          <!-- <img src="YOUR_LOGO_URL" style="width:50px; height:auto; margin:0 auto 5px auto; display:block;" /> -->
          <div class="store" style="font-weight: 900; color: #000000; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Arial Black', Gadget, sans-serif;">${storeInfo.name}</div>
          <div class="dt" style="font-weight: 900; color: #000000; font-size: 18px; border: 3px solid #000000; display: inline-block; padding: 2px 8px; margin: 6px 0; font-family: 'Arial Black', Gadget, sans-serif;">TAG NO: ${order.id} (${i}/${totalQty})</div>
          <div style="border-top: 2px solid #000000; margin: 5px 0;"></div>
          <div class="garment" style="font-weight: 900; color: #000000; font-size: 17px; text-align: left; font-family: 'Arial Black', sans-serif;">Item: ${item.itemName}</div>
          <div class="service" style="font-weight: 900; color: #000000; font-size: 16px; text-align: left; margin-top: 4px; font-family: 'Arial Black', sans-serif;">Service: ${service}</div>
        </div>
      `;
    }
  });

  const html = <html><head><title>Tags</title><style>@page { size: 58mm auto; margin: 0; } body { font-family: 'Arial Black', Arial, sans-serif; width: 58mm; margin: 0; padding: 3mm; color: #000000; -webkit-print-color-adjust: exact; }</style></head><body>${tagBlocks}</body></html>;
  openPrintWindow(html);
}

export function sendReadyNotification(customerPhone: string, orderId: string) {
  const message = ✨ *ORDER READY NOTIFICATION* ✨\n\nDear Customer,\n\nYour order *#${orderId}* is fully processed and ready for pickup! 🧺\n\nKindly inform the store team whether you will be visiting the outlet to collect your garments or if you would prefer our delivery personnel to safely deliver them to your doorstep.\n\nBest Regards,\n*DRYCU-72H*\n(Zero Error, Neatness Objective);
  
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = https://web.whatsapp.com/send?phone=${customerPhone}&text=${encodedMessage};
  
  if (Platform.OS === 'web') {
    window.open(whatsappUrl, '_blank');
  }
}
