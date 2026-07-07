import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useLayout } from '@/hooks/useLayout';
import { Order } from '@/types';

type FilterMode = 'today' | 'week' | 'month' | 'year' | 'custom_month' | 'custom_date';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekRange(d: Date) {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function filterOrders(orders: Order[], mode: FilterMode, customMonth: number, customYear: number, customDate: string): Order[] {
  const now = new Date();
  return orders.filter(o => {
    const d = new Date(o.createdAt);
    if (mode === 'today') return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (mode === 'week') { const { start, end } = getWeekRange(now); return d >= start && d <= end; }
    if (mode === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (mode === 'year') return d.getFullYear() === now.getFullYear();
    if (mode === 'custom_month') return d.getMonth() === customMonth && d.getFullYear() === customYear;
    if (mode === 'custom_date') {
      const [y, m, day2] = customDate.split('-').map(Number);
      return d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === day2;
    }
    return true;
  });
}

function FilterLabel(mode: FilterMode, customMonth: number, customYear: number, customDate: string): string {
  const now = new Date();
  if (mode === 'today') return `Today, ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  if (mode === 'week') {
    const { start, end } = getWeekRange(now);
    return `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  }
  if (mode === 'month') return `${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
  if (mode === 'year') return `Year ${now.getFullYear()}`;
  if (mode === 'custom_month') return `${MONTHS[customMonth]} ${customYear}`;
  if (mode === 'custom_date') return customDate;
  return '';
}

export default function ReportsScreen() {
  const colors = useColors();
  const { orders, getCustomer } = useApp();
  const { isWide } = useLayout();

  const now = new Date();
  const [mode, setMode] = useState<FilterMode>('month');
  const [customMonth, setCustomMonth] = useState(now.getMonth());
  const [customYear, setCustomYear] = useState(now.getFullYear());
  const [customDate, setCustomDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear().toString());
  const [pickerMonth, setPickerMonth] = useState(now.getMonth());
  const [dateInput, setDateInput] = useState(customDate);

  const filtered = useMemo(() =>
    filterOrders(orders, mode, customMonth, customYear, customDate).sort((a, b) => a.diNumber - b.diNumber),
    [orders, mode, customMonth, customYear, customDate]
  );

  const totalRevenue = filtered.reduce((s, o) => s + o.netPayable, 0);
  const totalGross   = filtered.reduce((s, o) => s + o.grossAmount, 0);
  const totalDiscount = filtered.reduce((s, o) => s + o.discountAmount, 0);
  const uniqueCustomers = new Set(filtered.map(o => o.customerId)).size;

  const webTop = !isWide && Platform.OS === 'web' ? 67 : 0;

  const FILTER_BTNS: { label: string; value: FilterMode }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Pick Month', value: 'custom_month' },
    { label: 'Pick Date', value: 'custom_date' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: webTop }]}>
      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { borderBottomColor: colors.border }]} contentContainerStyle={styles.filterContent}>
        {FILTER_BTNS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterPill,
              mode === f.value
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={() => {
              if (f.value === 'custom_month') { setPickerYear(customYear.toString()); setPickerMonth(customMonth); setShowMonthPicker(true); }
              else if (f.value === 'custom_date') { setDateInput(customDate); setShowDatePicker(true); }
              else setMode(f.value);
            }}
          >
            <Text style={[styles.filterPillText, { color: mode === f.value ? '#fff' : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Period Label */}
        <View style={[styles.periodBar, { backgroundColor: colors.secondary }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.periodText, { color: colors.primary }]}>
            {FilterLabel(mode, customMonth, customYear, customDate)}
          </Text>
        </View>

        {/* Summary Cards — 4 across on wide, 2×2 on narrow */}
        <View style={[styles.summaryGrid, isWide && styles.summaryGridWide]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.summaryCardValue}>{filtered.length}</Text>
            <Text style={styles.summaryCardLabel}>Total Orders</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.accent }]}>
            <Text style={styles.summaryCardValue}>{uniqueCustomers}</Text>
            <Text style={styles.summaryCardLabel}>Customers</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warning }]}>
            <Text style={styles.summaryCardValue}>₹{totalGross.toFixed(0)}</Text>
            <Text style={styles.summaryCardLabel}>Gross Revenue</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#16A34A' }]}>
            <Text style={styles.summaryCardValue}>₹{totalRevenue.toFixed(0)}</Text>
            <Text style={styles.summaryCardLabel}>Net Collected</Text>
          </View>
        </View>

        {totalDiscount > 0 && (
          <View style={[styles.discountBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="pricetag-outline" size={15} color={colors.destructive} />
            <Text style={[styles.discountText, { color: colors.destructive }]}>
              Total Discounts Given: ₹{totalDiscount.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Orders Table */}
        {filtered.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders in this period</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try selecting a different date range</Text>
          </View>
        ) : (
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
              <Text style={[styles.thSNo,    { color: colors.mutedForeground }]}>S.No</Text>
              <Text style={[styles.thName,   { color: colors.mutedForeground }]}>Customer Name</Text>
              <Text style={[styles.thDI,     { color: colors.mutedForeground }]}>DI No.</Text>
              {isWide && <Text style={[styles.thStatus, { color: colors.mutedForeground }]}>Status</Text>}
              <Text style={[styles.thDate,   { color: colors.mutedForeground }]}>Date</Text>
              {isWide && <Text style={[styles.thDiscount, { color: colors.mutedForeground }]}>Disc.</Text>}
              <Text style={[styles.thAmount, { color: colors.mutedForeground }]}>Amount</Text>
            </View>

            {filtered.map((order, idx) => {
              const customer = getCustomer(order.customerId);
              const statusColor: Record<string, string> = {
                Pending: colors.warning,
                Ready: colors.accent,
                Delivered: colors.mutedForeground,
              };
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.tableRow, { borderBottomColor: colors.border }]}
                  onPress={() => router.push(`/customer/${order.customerId}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.snoCell, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.snoText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.nameCell}>
                    <Text style={[styles.customerName, { color: colors.foreground }]} numberOfLines={1}>
                      {customer?.name ?? 'Unknown'}
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: statusColor[order.status] }]} />
                  </View>
                  <Text style={[styles.diCell, { color: colors.primary }]}>{order.id}</Text>
                  {isWide && (
                    <Text style={[styles.statusCell, { color: statusColor[order.status] }]}>{order.status}</Text>
                  )}
                  <Text style={[styles.dateCell, { color: colors.mutedForeground }]}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                  {isWide && (
                    <Text style={[styles.discountCell, { color: order.discountAmount > 0 ? colors.destructive : colors.mutedForeground }]}>
                      {order.discountAmount > 0 ? `-₹${order.discountAmount.toFixed(0)}` : '—'}
                    </Text>
                  )}
                  <Text style={[styles.amountCell, { color: colors.foreground }]}>
                    ₹{order.netPayable.toFixed(0)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.tableFooter, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
              <Text style={[styles.footerLabel, { color: colors.primary }]}>
                {filtered.length} orders · {uniqueCustomers} customers
              </Text>
              <Text style={[styles.footerTotal, { color: colors.primary }]}>₹{totalRevenue.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Month & Year</Text>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => (parseInt(y) - 1).toString())} style={[styles.yearArrow, { backgroundColor: colors.muted }]}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.yearInput, { color: colors.foreground, borderColor: colors.border }]}
                value={pickerYear} onChangeText={setPickerYear} keyboardType="number-pad" maxLength={4}
              />
              <TouchableOpacity onPress={() => setPickerYear(y => (parseInt(y) + 1).toString())} style={[styles.yearArrow, { backgroundColor: colors.muted }]}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity key={m} style={[styles.monthBtn, pickerMonth === i ? { backgroundColor: colors.primary } : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setPickerMonth(i)}>
                  <Text style={[styles.monthBtnText, { color: pickerMonth === i ? '#fff' : colors.foreground }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowMonthPicker(false)}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalApplyBtn, { backgroundColor: colors.primary }]} onPress={() => {
                const y = parseInt(pickerYear) || now.getFullYear();
                setCustomMonth(pickerMonth); setCustomYear(y); setMode('custom_month'); setShowMonthPicker(false);
              }}>
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Date</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Enter date in YYYY-MM-DD format</Text>
            <TextInput
              style={[styles.dateInput, { borderColor: colors.border, color: colors.foreground }]}
              value={dateInput} onChangeText={setDateInput} placeholder="2026-06-22"
              placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" maxLength={10}
            />
            <Text style={[styles.dateHint, { color: colors.mutedForeground }]}>Quick Selects:</Text>
            <View style={styles.quickDateRow}>
              {[-2, -1, 0].map(offset => {
                const d = new Date(now);
                d.setDate(now.getDate() + offset);
                const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return (
                  <TouchableOpacity key={offset} style={[styles.quickDateBtn, { backgroundColor: colors.secondary, borderColor: colors.primary }]} onPress={() => setDateInput(val)}>
                    <Text style={[styles.quickDateText, { color: colors.primary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalApplyBtn, { backgroundColor: colors.primary }]} onPress={() => { setCustomDate(dateInput); setMode('custom_date'); setShowDatePicker(false); }}>
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { borderBottomWidth: 1, maxHeight: 54, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterPillText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: 16, gap: 14, paddingBottom: 60 },
  periodBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  periodText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryGridWide: { flexWrap: 'nowrap' },
  summaryCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 14, gap: 4 },
  summaryCardValue: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' },
  summaryCardLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.85)' },
  discountBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  discountText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  emptyBox: { borderRadius: 14, borderWidth: 1, padding: 40, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  tableCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 6 },
  thSNo:      { width: 34, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', textAlign: 'center' },
  thName:     { flex: 1,   fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thDI:       { width: 72, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thStatus:   { width: 64, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thDate:     { width: 52, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thDiscount: { width: 56, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', textAlign: 'right' },
  thAmount:   { width: 60, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, gap: 6 },
  snoCell: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  snoText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  nameCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  diCell:       { width: 72, fontSize: 12, fontFamily: 'Inter_700Bold' },
  statusCell:   { width: 64, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  dateCell:     { width: 52, fontSize: 11, fontFamily: 'Inter_400Regular' },
  discountCell: { width: 56, fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  amountCell:   { width: 60, fontSize: 13, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderTopWidth: 1 },
  footerLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  footerTotal: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  yearArrow: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  yearInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center', width: 100 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  monthBtn: { width: '23%', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  monthBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  dateInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 12 },
  dateHint: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 8 },
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickDateBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  quickDateText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, borderWidth: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  modalApplyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalApplyText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
