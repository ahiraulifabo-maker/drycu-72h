import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { STORE_INFO } from '@/constants/storeInfo';
import { printTags, printBill } from '@/utils/print';
import { Order, OrderStatus } from '@/types';

const SERVICE_ABBR: Record<string, string> = {
  'Laundry': 'LAU',
  'Dry Cleaning': 'DC',
  'Simple Press': 'SP',
  'Steam Press': 'STP',
};

const BILL_TERMS = [
  `#1. DRYCU-72H is not liable for color fastness, threads-out, missing buttons, or any other damages.`,
  `#2. Report damages, missing items, or exchanged clothes to DRYCU-72H within 24 hours of delivery.`,
  `#3. Refer to our website (www.drycu-72h.in) or mobile app for complete Terms and Conditions.`,
  `#4. We aim for on-time clothing delivery, but if delays occur due to unforeseen circumstances, we'll keep you updated on the new delivery schedule.`,
  `#5. We accept no liability for any loss or damage of the clothes arising due to washing, fire, burglary etc.`,
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors = useColors();
  const colorMap: Record<OrderStatus, string> = {
    Pending: colors.warning,
    Ready: colors.accent,
    Delivered: colors.mutedForeground,
  };
  return (
    <View style={[styles.statusBadge, { backgroundColor: colorMap[status] + '22' }]}>
      <View style={[styles.statusDot, { backgroundColor: colorMap[status] }]} />
      <Text style={[styles.statusText, { color: colorMap[status] }]}>{status}</Text>
    </View>
  );
}

function TagLayout({ order, customerName }: { order: Order; customerName: string }) {
  const pickup = new Date(order.pickupDeadline);
  const created = new Date(order.createdAt);
  const totalKg = order.items.reduce((s, i) => s + (i.kg || 0), 0);
  const totalQty = order.items.reduce((s, i) => s + (i.qty || 0), 0);

  return (
    <View style={styles.tagOuter}>
      <View style={styles.tagBox}>
        <View style={styles.tagLogoBox}>
          <Text style={styles.tagLogoX}>✕</Text>
        </View>
        <Text style={styles.tagStoreName}>DRYCU-72H</Text>
        <View style={styles.tagDivider} />
        <Text style={styles.tagDI}>{order.id}</Text>
        <Text style={styles.tagCustomer}>{customerName}</Text>
        <Text style={styles.tagDate}>{created.toLocaleDateString('en-IN')} {created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        <View style={styles.tagDivider} />
        {order.items.map(item => (
          <View key={item.id} style={styles.tagItem}>
            <Text style={styles.tagItemText}>{item.itemName} · {SERVICE_ABBR[item.serviceType] ?? item.serviceType}</Text>
            <Text style={styles.tagItemDetail}>
              {item.kg > 0 ? `${item.kg}kg` : ''}{item.qty > 0 ? ` ${item.qty}pc` : ''}
            </Text>
          </View>
        ))}
        {order.topUps && order.topUps.filter(t => t.qty > 0).map(t => (
          <View key={t.name} style={styles.tagItem}>
            <Text style={styles.tagItemText}>{t.name} ×{t.qty}</Text>
          </View>
        ))}
        <View style={styles.tagDivider} />
        <View style={styles.tagSummaryRow}>
          <Text style={styles.tagSummaryLabel}>T.KG {totalKg.toFixed(3)}</Text>
          <Text style={styles.tagSummaryLabel}>Qty {totalQty}</Text>
        </View>
        <View style={styles.tagDivider} />
        <Text style={styles.tagPickupLabel}>READY BY</Text>
        <Text style={styles.tagPickupDate}>
          {pickup.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={styles.tagPickupTime}>
          {pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {order.bookedBy && <Text style={styles.tagBooked}>Booked By: {order.bookedBy}</Text>}
      </View>
    </View>
  );
}

function BillLayout({ order, customerName, customerMobile, customerAddress }: {
  order: Order;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
}) {
  const pickup = new Date(order.pickupDeadline);
  const created = new Date(order.createdAt);
  const totalKg = order.items.reduce((s, i) => s + (i.kg || 0), 0);
  const advance = order.advancePaid ?? 0;
  const balAmt = order.netPayable - advance;

  return (
    <View style={styles.billOuter}>
      <View style={styles.billBox}>
        {/* Header */}
        <View style={styles.billLogoBox}>
          <Text style={styles.billLogoX}>✕</Text>
        </View>
        <Text style={styles.billStoreName}>{STORE_INFO.name}</Text>
        <Text style={styles.billAddress}>{STORE_INFO.line1}</Text>
        <Text style={styles.billAddress}>{STORE_INFO.line2}</Text>
        <Text style={styles.billContact}>Contact: {STORE_INFO.contact}</Text>
        <Text style={styles.billTagline}>{STORE_INFO.tagline}</Text>

        <View style={styles.billDivider} />

        {/* DI + Customer */}
        <Text style={styles.billDINumber}>{order.id}</Text>
        <Text style={styles.billCustName}>{customerName}</Text>
        <Text style={styles.billCustDetail}>
          {customerAddress}{customerMobile ? `(${customerMobile})` : ''}
        </Text>
        <Text style={styles.billCustDetail}>Place of Supply- {STORE_INFO.placeOfSupply}</Text>
        <Text style={styles.billDateTime}>
          {created.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
          {created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>

        <View style={styles.billDivider} />

        {/* Items Table */}
        <View style={styles.billTableHeader}>
          <Text style={[styles.billTH, { width: 52 }]}>KG</Text>
          <Text style={[styles.billTH, { width: 36 }]}>Qty</Text>
          <Text style={[styles.billTH, { flex: 1 }]}>Service</Text>
          <Text style={[styles.billTH, { width: 60, textAlign: 'right' }]}>INR</Text>
        </View>
        <View style={styles.billItemDivider} />

        {order.items.map(item => (
          <View key={item.id} style={styles.billTableRow}>
            <Text style={[styles.billTD, { width: 52 }]}>{item.kg > 0 ? item.kg.toFixed(3) : '-'}</Text>
            <Text style={[styles.billTD, { width: 36 }]}>{item.qty > 0 ? item.qty : '-'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.billTDName}>{item.itemName}</Text>
              <Text style={styles.billTDService}>{SERVICE_ABBR[item.serviceType] ?? item.serviceType}</Text>
            </View>
            <Text style={[styles.billTD, { width: 60, textAlign: 'right' }]}>{item.subtotal.toFixed(2)}</Text>
          </View>
        ))}

        {/* Top-Ups in bill */}
        {order.topUps && order.topUps.filter(t => t.qty > 0).length > 0 && (
          <>
            <View style={styles.billItemDivider} />
            <Text style={styles.billTopUpHeader}>Top-Up Services</Text>
            {order.topUps.filter(t => t.qty > 0).map(t => (
              <View key={t.name} style={styles.billTableRow}>
                <Text style={[styles.billTD, { width: 52 }]}>-</Text>
                <Text style={[styles.billTD, { width: 36 }]}>{t.qty}</Text>
                <Text style={[styles.billTDName, { flex: 1 }]}>{t.name}</Text>
                <Text style={[styles.billTD, { width: 60, textAlign: 'right' }]}>{t.subtotal.toFixed(2)}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.billDivider} />

        {/* Summary */}
        <View style={styles.billSummaryRow}>
          <Text style={styles.billSummaryLeft}>T.KG {totalKg.toFixed(3)}</Text>
          <View style={styles.billSummaryRight}>
            <View style={styles.billSummaryLine}>
              <Text style={styles.billSummaryKey}>G Amt.</Text>
              <Text style={styles.billSummaryVal}>{order.grossAmount.toFixed(2)}</Text>
            </View>
            {order.discountAmount > 0 && (
              <View style={styles.billSummaryLine}>
                <Text style={styles.billSummaryKey}>Discount</Text>
                <Text style={styles.billSummaryVal}>-{order.discountAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.billSummaryLine}>
              <Text style={styles.billSummaryKey}>Adv</Text>
              <Text style={styles.billSummaryVal}>{advance.toFixed(2)}</Text>
            </View>
            <View style={styles.billSummaryLine}>
              <Text style={[styles.billSummaryKey, { fontFamily: 'Inter_700Bold' }]}>Bal.Amt.</Text>
              <Text style={[styles.billSummaryVal, { fontFamily: 'Inter_700Bold' }]}>{balAmt.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.billDivider} />

        {/* Ready On, Booked By, Timing */}
        <Text style={styles.billReadyOn}>
          Ready On: {pickup.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}{' '}
          {pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {order.bookedBy && <Text style={styles.billBookedBy}>Booked By : {order.bookedBy}</Text>}
        <Text style={styles.billAdvLine}>Advance balance: {advance.toFixed(0)}</Text>
        <Text style={styles.billTiming}>Store Timing {STORE_INFO.timing}</Text>

        {order.note ? (
          <>
            <View style={styles.billDivider} />
            <Text style={styles.billNote}>Note: {order.note}</Text>
          </>
        ) : null}

        {/* Double dividers */}
        <View style={[styles.billDivider, { marginBottom: 2 }]} />
        <View style={[styles.billDivider, { marginTop: 2 }]} />

        {/* Terms */}
        <Text style={styles.billTermsTitle}>Terms and Conditions</Text>
        {BILL_TERMS.map((t, i) => (
          <Text key={i} style={styles.billTerm}>{t}</Text>
        ))}

        <View style={styles.billDivider} />

        {/* Signature */}
        <View style={styles.billSignatureRow}>
          <View style={styles.billSignatureBox}>
            <View style={styles.billSignatureLine} />
            <Text style={styles.billSignatureLabel}>Customer</Text>
          </View>
          <View style={styles.billSignatureBox}>
            <View style={styles.billSignatureLine} />
            <Text style={styles.billSignatureLabel}>Salesman</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { getOrder, getCustomer, updateOrderStatus, deleteOrder } = useApp();
  const order = getOrder(id);
  const [activeTab, setActiveTab] = useState<'details' | 'tag' | 'bill'>('details');

  if (!order) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Order not found.</Text>
      </View>
    );
  }

  const customer = getCustomer(order.customerId);
  const pickup = new Date(order.pickupDeadline);
  const advance = order.advancePaid ?? 0;
  const balAmt = order.netPayable - advance;

  const statusOptions: OrderStatus[] = ['Pending', 'Ready', 'Delivered'];
  const statusColor: Record<OrderStatus, string> = {
    Pending: colors.warning,
    Ready: colors.accent,
    Delivered: colors.mutedForeground,
  };

  const buildWhatsAppMessage = () => {
    const itemLines = order.items.map((item, i) =>
      `${i + 1}. ${item.itemName} (${item.serviceType})${item.kg > 0 ? ` ${item.kg}kg` : ''}${item.qty > 0 ? ` ×${item.qty}pc` : ''} = ₹${item.subtotal.toFixed(2)}`
    ).join('\n');
    const topUpLines = (order.topUps ?? []).filter(t => t.qty > 0).map(t =>
      `• ${t.name} ×${t.qty} = ₹${t.subtotal.toFixed(2)}`
    ).join('\n');

    return `*DRYCU-72H – Order Summary*
━━━━━━━━━━━━━━━━━━━━
*DI No:* ${order.id}
*Customer:* ${customer?.name ?? 'N/A'}
*Date:* ${new Date(order.createdAt).toLocaleDateString('en-IN')}

*Garments:*
${itemLines}${topUpLines ? `\n\n*Top-Up Services:*\n${topUpLines}` : ''}

━━━━━━━━━━━━━━━━━━━━
*Gross:* ₹${order.grossAmount.toFixed(2)}${order.discountAmount > 0 ? `\n*Discount:* -₹${order.discountAmount.toFixed(2)}` : ''}
*Net Payable: ₹${order.netPayable.toFixed(2)}*
*Advance:* ₹${advance.toFixed(2)}
*Balance Due:* ₹${balAmt.toFixed(2)}

*Ready by:* ${pickup.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} at ${pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}

Thank you for choosing DRYCU-72H! ${STORE_INFO.website}`;
  };

  const sendWhatsApp = () => {
    if (!customer?.mobile) { Alert.alert('No mobile', 'Customer has no mobile number.'); return; }
    const mobile = customer.mobile.replace(/\D/g, '');
    const intlMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    const url = `https://wa.me/${intlMobile}?text=${encodeURIComponent(buildWhatsAppMessage())}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleStatusChange = (s: OrderStatus) => {
    Alert.alert('Update Status', `Mark this order as "${s}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: async () => { await updateOrderStatus(id, s); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Order', `Delete order ${order.id}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteOrder(id); router.back(); } },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: order.id,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.destructive} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(['details', 'tag', 'bill'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveTab(t)}
            >
              <Ionicons
                name={t === 'details' ? 'list-outline' : t === 'tag' ? 'pricetag-outline' : 'document-text-outline'}
                size={16}
                color={activeTab === t ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                {t === 'details' ? 'Details' : t === 'tag' ? 'Tag (58mm)' : 'Bill (80mm)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {activeTab === 'details' && (
            <>
              {/* Print Quick Actions */}
              <View style={styles.printRow}>
                <TouchableOpacity
                  style={[styles.printCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    printTags(order);
                  }}
                >
                  <Ionicons name="pricetag" size={28} color={colors.primary} />
                  <Text style={[styles.printCardTitle, { color: colors.foreground }]}>Print Tags</Text>
                  <Text style={[styles.printCardSub, { color: colors.mutedForeground }]}>58mm · {order.items.length} tag{order.items.length !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.printCard, { backgroundColor: colors.card, borderColor: colors.accent }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    printBill(order, customer);
                  }}
                >
                  <Ionicons name="document-text" size={28} color={colors.accent} />
                  <Text style={[styles.printCardTitle, { color: colors.foreground }]}>Print Bill</Text>
                  <Text style={[styles.printCardSub, { color: colors.mutedForeground }]}>80mm receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.printCard, { backgroundColor: '#25D36622', borderColor: '#25D366' }]}
                  onPress={sendWhatsApp}
                >
                  <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                  <Text style={[styles.printCardTitle, { color: colors.foreground }]}>WhatsApp</Text>
                  <Text style={[styles.printCardSub, { color: colors.mutedForeground }]}>Send summary</Text>
                </TouchableOpacity>
              </View>

              {/* Status */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statusRow}>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>Status</Text>
                  <StatusBadge status={order.status} />
                </View>
                <View style={styles.statusBtns}>
                  {statusOptions.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusChangeBtn,
                        order.status === s
                          ? { backgroundColor: statusColor[s] }
                          : { backgroundColor: statusColor[s] + '20', borderColor: statusColor[s], borderWidth: 1 },
                      ]}
                      onPress={() => handleStatusChange(s)}
                    >
                      <Text style={[styles.statusChangeBtnText, { color: order.status === s ? '#fff' : statusColor[s] }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Customer */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Customer</Text>
                {customer ? (
                  <TouchableOpacity onPress={() => router.push(`/customer/${customer.id}`)}>
                    <Text style={[styles.custName, { color: colors.foreground }]}>{customer.name}</Text>
                    <Text style={[styles.custMobile, { color: colors.mutedForeground }]}>{customer.mobile}</Text>
                    <Text style={[styles.custLink, { color: colors.primary }]}>View Profile & Add Order →</Text>
                  </TouchableOpacity>
                ) : <Text style={{ color: colors.mutedForeground }}>Unknown customer</Text>}
              </View>

              {/* Items */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Garments ({order.items.length})</Text>
                {order.items.map(item => (
                  <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.itemName}</Text>
                      <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>
                        {item.serviceType}{item.kg > 0 ? ` · ${item.kg}kg` : ''}{item.qty > 0 ? ` · ×${item.qty}pc` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.itemAmount, { color: colors.foreground }]}>₹{item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
                {(order.topUps ?? []).filter(t => t.qty > 0).length > 0 && (
                  <>
                    <Text style={[styles.topUpSectionLabel, { color: colors.mutedForeground }]}>Top-Up Services</Text>
                    {(order.topUps ?? []).filter(t => t.qty > 0).map(t => (
                      <View key={t.name} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, { color: colors.foreground }]}>{t.name}</Text>
                          <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>×{t.qty} · ₹{t.rate}/service</Text>
                        </View>
                        <Text style={[styles.itemAmount, { color: colors.foreground }]}>₹{t.subtotal.toFixed(2)}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* Financials */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Financial Breakdown</Text>
                <View style={styles.finRow}>
                  <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>Gross Amount</Text>
                  <Text style={[styles.finVal, { color: colors.foreground }]}>₹{order.grossAmount.toFixed(2)}</Text>
                </View>
                {order.discountAmount > 0 && (
                  <View style={styles.finRow}>
                    <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>
                      Discount ({order.discountType === 'percentage' ? `${order.discountValue}%` : 'Flat'})
                    </Text>
                    <Text style={[styles.finVal, { color: colors.destructive }]}>-₹{order.discountAmount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.finTotal, { borderTopColor: colors.border }]}>
                  <Text style={[styles.finTotalLabel, { color: colors.foreground }]}>Net Payable</Text>
                  <Text style={[styles.finTotalVal, { color: colors.primary }]}>₹{order.netPayable.toFixed(2)}</Text>
                </View>
                <View style={styles.finRow}>
                  <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>Advance Paid</Text>
                  <Text style={[styles.finVal, { color: colors.accent }]}>₹{advance.toFixed(2)}</Text>
                </View>
                <View style={styles.finRow}>
                  <Text style={[styles.finLabel, { color: colors.warning, fontFamily: 'Inter_700Bold' }]}>Balance Due</Text>
                  <Text style={[styles.finVal, { color: colors.warning, fontFamily: 'Inter_700Bold' }]}>₹{balAmt.toFixed(2)}</Text>
                </View>
              </View>

              {/* Pickup */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Pickup Deadline</Text>
                <Text style={[styles.pickupDate, { color: colors.foreground }]}>
                  {pickup.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <Text style={[styles.pickupTime, { color: colors.primary }]}>
                  {pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {order.bookedBy && (
                  <Text style={[styles.bookedBy, { color: colors.mutedForeground }]}>Booked by: {order.bookedBy}</Text>
                )}
                {order.note ? <Text style={[styles.note, { color: colors.foreground }]}>{order.note}</Text> : null}
              </View>
            </>
          )}

          {activeTab === 'tag' && (
            <>
              <TagLayout order={order} customerName={customer?.name ?? 'N/A'} />
              <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={sendWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Send via WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'bill' && (
            <>
              <BillLayout
                order={order}
                customerName={customer?.name ?? 'N/A'}
                customerMobile={customer?.mobile ?? ''}
                customerAddress={customer?.address ?? ''}
              />
              <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={sendWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Send via WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  printRow: { flexDirection: 'row', gap: 10 },
  printCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  printCardTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  printCardSub: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  section: { borderRadius: 14, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  statusBtns: { flexDirection: 'row', gap: 8 },
  statusChangeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  statusChangeBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  custName: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  custMobile: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  custLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  itemName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  itemDetail: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  itemAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  topUpSectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  finLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  finVal: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  finTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  finTotalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  finTotalVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  pickupDate: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  pickupTime: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 4 },
  bookedBy: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 6 },
  note: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  shareBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  // Tag styles
  tagOuter: { alignItems: 'center', paddingVertical: 8 },
  tagBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#aaa', padding: 14, width: 240, borderRadius: 6, alignItems: 'center' },
  tagLogoBox: { width: 32, height: 32, borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tagLogoX: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000' },
  tagStoreName: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: '#000' },
  tagDivider: { height: 1, backgroundColor: '#aaa', width: '100%', marginVertical: 8 },
  tagDI: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 1, color: '#000' },
  tagCustomer: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#000', marginTop: 2 },
  tagDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555', marginTop: 2 },
  tagItem: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tagItemText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#000' },
  tagItemDetail: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  tagSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  tagSummaryLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#000' },
  tagPickupLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1, color: '#888', marginTop: 4, textTransform: 'uppercase' },
  tagPickupDate: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#000' },
  tagPickupTime: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#333' },
  tagBooked: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#666', marginTop: 4 },

  // Bill styles
  billOuter: { alignItems: 'center', paddingVertical: 8 },
  billBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#aaa', padding: 16, width: '100%', borderRadius: 6 },
  billLogoBox: { width: 32, height: 32, borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 4 },
  billLogoX: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000' },
  billStoreName: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase', color: '#000' },
  billAddress: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', color: '#333', marginTop: 1 },
  billContact: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', color: '#333', marginTop: 2 },
  billTagline: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 2 },
  billDivider: { height: 1, backgroundColor: '#aaa', marginVertical: 8 },
  billDINumber: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#000', marginBottom: 2 },
  billCustName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#000' },
  billCustDetail: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#444', marginTop: 1 },
  billDateTime: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#333', marginTop: 4 },
  billTableHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  billTH: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', textTransform: 'uppercase' },
  billItemDivider: { height: 0.5, backgroundColor: '#ccc', marginVertical: 4 },
  billTableRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  billTD: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#222' },
  billTDName: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#000' },
  billTDService: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#666' },
  billTopUpHeader: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#555', textTransform: 'uppercase', marginBottom: 4 },
  billSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billSummaryLeft: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#000', paddingTop: 4 },
  billSummaryRight: { alignItems: 'flex-end', gap: 3 },
  billSummaryLine: { flexDirection: 'row', gap: 12 },
  billSummaryKey: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#444', minWidth: 60 },
  billSummaryVal: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#000', minWidth: 60, textAlign: 'right' },
  billReadyOn: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#000', marginTop: 2 },
  billBookedBy: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#333', marginTop: 2 },
  billAdvLine: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#333', marginTop: 2 },
  billTiming: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#333', marginTop: 2 },
  billNote: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#444' },
  billTermsTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#000', marginBottom: 6 },
  billTerm: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#444', marginBottom: 4, lineHeight: 14 },
  billSignatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  billSignatureBox: { alignItems: 'center', width: '45%' },
  billSignatureLine: { height: 1, backgroundColor: '#000', width: '100%', marginBottom: 4 },
  billSignatureLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#000' },
});
