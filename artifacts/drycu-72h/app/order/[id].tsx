import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Order, OrderStatus } from '@/types';

const STORE_NAME = 'DRYCU-72H';
const STORE_ADDRESS = 'www.drycu-72h.in';

const BILL_TERMS = [
  `#1. ${STORE_NAME} is not liable for color fastness, threads-out, missing buttons, or any other damages.`,
  `#2. Report damages, missing items, or exchanged clothes to ${STORE_NAME} within 24 hours of delivery.`,
  `#3. Refer to our website (www.drycu-72h.in) or mobile app for complete Terms and Conditions.`,
  '#4. We aim for on-time clothing delivery, but if delays occur due to unforeseen circumstances, we\'ll keep you updated on the new delivery schedule.',
  '#5. We accept no liability for any loss or damage of the clothes arising due to washing, fire, burglary etc.',
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
  return (
    <View style={styles.tagContainer}>
      <View style={[styles.tagBox]}>
        <Text style={styles.tagStoreName}>{STORE_NAME}</Text>
        <View style={styles.tagDivider} />
        <Text style={styles.tagDI}>{order.id}</Text>
        <Text style={styles.tagCustomer}>{customerName}</Text>
        <View style={styles.tagDivider} />
        {order.items.map((item, i) => (
          <View key={item.id} style={styles.tagItem}>
            <Text style={styles.tagItemText}>
              {item.itemName} · {item.serviceType}
            </Text>
            <Text style={styles.tagItemDetail}>
              {item.kg > 0 ? `${item.kg}kg ` : ''}{item.qty > 0 ? `${item.qty}pc` : ''}
            </Text>
          </View>
        ))}
        <View style={styles.tagDivider} />
        <Text style={styles.tagPickupLabel}>READY BY</Text>
        <Text style={styles.tagPickupDate}>
          {pickup.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={styles.tagPickupTime}>
          {pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
  return (
    <View style={styles.billContainer}>
      <View style={styles.billBox}>
        <Text style={styles.billStoreName}>{STORE_NAME}</Text>
        <Text style={styles.billStoreWeb}>{STORE_ADDRESS}</Text>
        <Text style={styles.billDate}>
          Date: {created.toLocaleDateString('en-IN')} {created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={styles.billDivider} />

        <Text style={styles.billSectionTitle}>CUSTOMER DETAILS</Text>
        <Text style={styles.billCustName}>{customerName}</Text>
        <Text style={styles.billCustDetail}>Mobile: {customerMobile}</Text>
        {customerAddress ? <Text style={styles.billCustDetail}>{customerAddress}</Text> : null}
        <View style={styles.billDivider} />

        <Text style={styles.billSectionTitle}>DI No: {order.id}</Text>
        <View style={styles.billDivider} />

        <View style={styles.billItemHeader}>
          <Text style={[styles.billItemCol, { flex: 3 }]}>Item / Service</Text>
          <Text style={[styles.billItemCol, { flex: 1, textAlign: 'center' }]}>Wt/Qty</Text>
          <Text style={[styles.billItemCol, { flex: 1, textAlign: 'right' }]}>Amt</Text>
        </View>
        <View style={styles.billItemDivider} />
        {order.items.map(item => (
          <View key={item.id} style={styles.billItemRow}>
            <View style={{ flex: 3 }}>
              <Text style={styles.billItemName}>{item.itemName}</Text>
              <Text style={styles.billItemService}>{item.serviceType}</Text>
            </View>
            <Text style={[styles.billItemCol, { flex: 1, textAlign: 'center' }]}>
              {item.kg > 0 ? `${item.kg}kg` : ''}{item.qty > 0 ? ` ${item.qty}pc` : ''}
            </Text>
            <Text style={[styles.billItemCol, { flex: 1, textAlign: 'right' }]}>₹{item.subtotal.toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.billDivider} />

        <View style={styles.billFinRow}>
          <Text style={styles.billFinLabel}>Subtotal</Text>
          <Text style={styles.billFinVal}>₹{order.grossAmount.toFixed(2)}</Text>
        </View>
        {order.discountAmount > 0 && (
          <View style={styles.billFinRow}>
            <Text style={styles.billFinLabel}>
              Discount ({order.discountType === 'percentage' ? `${order.discountValue}%` : 'Flat'})
            </Text>
            <Text style={[styles.billFinVal, { color: '#c00' }]}>-₹{order.discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.billDivider} />
        <View style={styles.billFinRow}>
          <Text style={styles.billNetLabel}>NET PAYABLE</Text>
          <Text style={styles.billNetVal}>₹{order.netPayable.toFixed(2)}</Text>
        </View>
        <View style={styles.billDivider} />

        <Text style={styles.billPickupLabel}>PICKUP DEADLINE</Text>
        <Text style={styles.billPickupDate}>
          {pickup.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' at '}
          {pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {order.note ? (
          <>
            <View style={styles.billDivider} />
            <Text style={styles.billNoteLabel}>NOTE</Text>
            <Text style={styles.billNote}>{order.note}</Text>
          </>
        ) : null}
        <View style={styles.billDivider} />
        <Text style={styles.billTermsTitle}>TERMS & CONDITIONS</Text>
        {BILL_TERMS.map((t, i) => (
          <Text key={i} style={styles.billTerm}>{t}</Text>
        ))}
        <View style={styles.billDivider} />
        <Text style={styles.billThank}>Thank you for choosing {STORE_NAME}!</Text>
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

  const statusOptions: OrderStatus[] = ['Pending', 'Ready', 'Delivered'];
  const statusColor: Record<OrderStatus, string> = {
    Pending: colors.warning,
    Ready: colors.accent,
    Delivered: colors.mutedForeground,
  };

  const buildWhatsAppMessage = () => {
    const itemLines = order.items.map((item, i) =>
      `${i + 1}. ${item.itemName} (${item.serviceType})${item.kg > 0 ? ` ${item.kg}kg` : ''}${item.qty > 0 ? ` x${item.qty}pc` : ''} = ₹${item.subtotal.toFixed(2)}`
    ).join('\n');

    return `*${STORE_NAME} - Order Summary*
━━━━━━━━━━━━━━━━━━━━
*DI Number:* ${order.id}
*Customer:* ${customer?.name ?? 'N/A'}
*Date:* ${new Date(order.createdAt).toLocaleDateString('en-IN')}

*Items:*
${itemLines}

━━━━━━━━━━━━━━━━━━━━
*Subtotal:* ₹${order.grossAmount.toFixed(2)}${order.discountAmount > 0 ? `\n*Discount:* -₹${order.discountAmount.toFixed(2)}` : ''}
*Net Payable: ₹${order.netPayable.toFixed(2)}*

*Ready by:* ${pickup.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} at ${pickup.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}

Thank you for choosing ${STORE_NAME}! We'll keep you updated. ${STORE_ADDRESS}`;
  };

  const sendWhatsApp = () => {
    if (!customer?.mobile) { Alert.alert('No mobile', 'Customer has no mobile number.'); return; }
    const mobile = customer.mobile.replace(/\D/g, '');
    const intlMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    const msg = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${intlMobile}?text=${msg}`;
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
              style={[styles.tabBtn, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                {t === 'details' ? 'Details' : t === 'tag' ? 'Tag (58mm)' : 'Bill (80mm)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {activeTab === 'details' && (
            <>
              {/* Status Bar */}
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

              {/* Customer Info */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Customer</Text>
                {customer ? (
                  <TouchableOpacity onPress={() => router.push(`/customer/${customer.id}`)}>
                    <Text style={[styles.custName, { color: colors.foreground }]}>{customer.name}</Text>
                    <Text style={[styles.custMobile, { color: colors.mutedForeground }]}>{customer.mobile}</Text>
                    <Text style={[styles.custLink, { color: colors.primary }]}>View Profile →</Text>
                  </TouchableOpacity>
                ) : <Text style={{ color: colors.mutedForeground }}>Unknown customer</Text>}
              </View>

              {/* Items */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Items ({order.items.length})</Text>
                {order.items.map(item => (
                  <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.itemName}</Text>
                      <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>
                        {item.serviceType} · {item.kg > 0 ? `${item.kg}kg` : ''} {item.qty > 0 ? `×${item.qty}pc` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.itemAmount, { color: colors.foreground }]}>₹{item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              {/* Financial Summary */}
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
                {order.note ? (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 12 }]}>Note</Text>
                    <Text style={[styles.note, { color: colors.foreground }]}>{order.note}</Text>
                  </>
                ) : null}
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                  onPress={sendWhatsApp}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Send WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === 'tag' && (
            <>
              <TagLayout order={order} customerName={customer?.name ?? 'N/A'} />
              <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary }]} onPress={sendWhatsApp}>
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
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
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
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  finLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  finVal: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  finTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  finTotalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  finTotalVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  pickupDate: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  pickupTime: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 4 },
  note: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  actionsRow: { gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  actionBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16, marginHorizontal: 16 },
  shareBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  // Tag layout
  tagContainer: { alignItems: 'center', paddingVertical: 16 },
  tagBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', padding: 14, width: 220, alignItems: 'center', borderRadius: 6 },
  tagStoreName: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  tagDivider: { height: 1, backgroundColor: '#ccc', width: '100%', marginVertical: 8 },
  tagDI: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  tagCustomer: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  tagItem: { width: '100%', alignItems: 'flex-start', marginVertical: 2 },
  tagItemText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  tagItemDetail: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555' },
  tagPickupLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, color: '#888', marginTop: 4 },
  tagPickupDate: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  tagPickupTime: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#444' },
  // Bill layout
  billContainer: { alignItems: 'center', paddingVertical: 16 },
  billBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', padding: 16, width: '100%', borderRadius: 6 },
  billStoreName: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  billStoreWeb: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', color: '#555', marginTop: 2 },
  billDate: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', color: '#666', marginTop: 4 },
  billDivider: { height: 1, backgroundColor: '#ccc', marginVertical: 10 },
  billSectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  billCustName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  billCustDetail: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#444' },
  billItemHeader: { flexDirection: 'row', marginBottom: 4 },
  billItemCol: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#666', textTransform: 'uppercase' },
  billItemDivider: { height: 1, backgroundColor: '#eee', marginBottom: 6 },
  billItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  billItemName: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  billItemService: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#666' },
  billFinRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  billFinLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#444' },
  billFinVal: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  billNetLabel: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  billNetVal: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  billPickupLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  billPickupDate: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  billNoteLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  billNote: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#444' },
  billTermsTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  billTerm: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#555', marginBottom: 4, lineHeight: 14 },
  billThank: { fontSize: 13, fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 4 },
});
