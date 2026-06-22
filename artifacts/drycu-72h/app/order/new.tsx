import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, GARMENTS, computeItemSubtotal, getRateLabel, SERVICE_TYPES } from '@/constants/rates';
import { Customer, DiscountType, ItemCategory, OrderItem, ServiceType } from '@/types';

function generateItemId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

const QUICK_PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '6 hrs', minutes: 360 },
  { label: '12 hrs', minutes: 720 },
  { label: '24 hrs', minutes: 1440 },
  { label: '48 hrs', minutes: 2880 },
  { label: '72 hrs (Default)', minutes: 4320 },
  { label: '1 Week', minutes: 10080 },
];

interface ItemModalState {
  visible: boolean;
  category: ItemCategory;
  itemName: string;
}

export default function NewOrderScreen() {
  const { customerId: paramCustomerId } = useLocalSearchParams<{ customerId?: string }>();
  const colors = useColors();
  const { customers, addOrder, searchCustomers } = useApp();

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    paramCustomerId ? customers.find(c => c.id === paramCustomerId) ?? null : null
  );
  const [showCustomerList, setShowCustomerList] = useState(false);

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('Men');
  const [itemModal, setItemModal] = useState<ItemModalState>({ visible: false, category: 'Men', itemName: '' });

  const [modalService, setModalService] = useState<ServiceType>('Dry Cleaning');
  const [modalKg, setModalKg] = useState('0');
  const [modalQty, setModalQty] = useState('1');

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const defaultDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const [pickupDeadline, setPickupDeadline] = useState(defaultDeadline);
  const [showDateModal, setShowDateModal] = useState(false);
  const [customDate, setCustomDate] = useState({
    day: defaultDeadline.getDate().toString(),
    month: (defaultDeadline.getMonth() + 1).toString(),
    year: defaultDeadline.getFullYear().toString(),
    hour: defaultDeadline.getHours().toString(),
    minute: defaultDeadline.getMinutes().toString().padStart(2, '0'),
  });

  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [note, setNote] = useState('');

  const filteredCustomers = customerSearch.trim() ? searchCustomers(customerSearch) : customers.slice(0, 20);

  const grossAmount = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (() => {
    const v = parseFloat(discountValue) || 0;
    if (discountType === 'flat') return Math.min(v, grossAmount);
    if (discountType === 'percentage') return (grossAmount * v) / 100;
    return 0;
  })();
  const taxable = grossAmount - discountAmount;
  const cgst = taxable * 0.09;
  const sgst = taxable * 0.09;
  const netPayable = taxable + cgst + sgst;

  const modalSubtotal = computeItemSubtotal(itemModal.itemName, modalService, parseFloat(modalKg) || 0, parseInt(modalQty) || 0);

  const openItemModal = (category: ItemCategory, itemName: string) => {
    setItemModal({ visible: true, category, itemName });
    setModalService('Dry Cleaning');
    setModalKg('0');
    setModalQty('1');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addItemToOrder = () => {
    const sub = computeItemSubtotal(itemModal.itemName, modalService, parseFloat(modalKg) || 0, parseInt(modalQty) || 0);
    const rate = modalService === 'Laundry'
      ? (parseFloat(modalKg) || 0) > 0 ? sub / (parseFloat(modalKg) || 1) : 0
      : (parseInt(modalQty) || 0) > 0 ? sub / (parseInt(modalQty) || 1) : 0;

    const item: OrderItem = {
      id: generateItemId(),
      category: itemModal.category,
      itemName: itemModal.itemName,
      serviceType: modalService,
      kg: parseFloat(modalKg) || 0,
      qty: parseInt(modalQty) || 0,
      ratePerUnit: rate,
      subtotal: sub,
    };
    setOrderItems(prev => [...prev, item]);
    setItemModal({ visible: false, category: 'Men', itemName: '' });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const removeItem = (id: string) => {
    setOrderItems(prev => prev.filter(i => i.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const applyPreset = (minutes: number) => {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    setPickupDeadline(d);
    setCustomDate({
      day: d.getDate().toString(),
      month: (d.getMonth() + 1).toString(),
      year: d.getFullYear().toString(),
      hour: d.getHours().toString(),
      minute: d.getMinutes().toString().padStart(2, '0'),
    });
    setShowDateModal(false);
  };

  const applyCustomDate = () => {
    const d = new Date(
      parseInt(customDate.year),
      parseInt(customDate.month) - 1,
      parseInt(customDate.day),
      parseInt(customDate.hour),
      parseInt(customDate.minute)
    );
    if (isNaN(d.getTime())) { Alert.alert('Invalid Date', 'Please check the date/time values.'); return; }
    setPickupDeadline(d);
    setShowDateModal(false);
  };

  const handleSave = async () => {
    if (!selectedCustomer) { Alert.alert('Required', 'Please select a customer.'); return; }
    if (orderItems.length === 0) { Alert.alert('Required', 'Please add at least one item.'); return; }

    const order = await addOrder({
      customerId: selectedCustomer.id,
      items: orderItems,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      pickupDeadline: pickupDeadline.toISOString(),
      note: note.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/order/${order.id}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Order', headerBackTitle: 'Cancel' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer Selection */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Customer</Text>
          {selectedCustomer ? (
            <View style={[styles.selectedCustomer, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selCustName, { color: colors.primary }]}>{selectedCustomer.name}</Text>
                <Text style={[styles.selCustMobile, { color: colors.mutedForeground }]}>{selectedCustomer.mobile}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search customer by name or mobile..."
                  placeholderTextColor={colors.mutedForeground}
                  value={customerSearch}
                  onChangeText={t => { setCustomerSearch(t); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                />
              </View>
              {showCustomerList && filteredCustomers.length > 0 && (
                <View style={[styles.dropDown, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  {filteredCustomers.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.dropItem, { borderBottomColor: colors.border }]}
                      onPress={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerList(false); }}
                    >
                      <Text style={[styles.dropName, { color: colors.foreground }]}>{c.name}</Text>
                      <Text style={[styles.dropMobile, { color: colors.mutedForeground }]}>{c.mobile}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Item Grid */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Add Items</Text>
          <View style={styles.categoryTabs}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catTab,
                  activeCategory === cat
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.muted },
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.catTabText, { color: activeCategory === cat ? '#fff' : colors.mutedForeground }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.garmentGrid}>
            {GARMENTS[activeCategory].map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.garmentBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => openItemModal(activeCategory, item)}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.garmentText, { color: colors.foreground }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Added Items */}
        {orderItems.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Order Items ({orderItems.length})</Text>
            {orderItems.map((item, idx) => (
              <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.itemName}</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                    {item.serviceType} · {item.kg > 0 ? `${item.kg}kg` : ''} {item.qty > 0 ? `× ${item.qty}pc` : ''}
                  </Text>
                </View>
                <Text style={[styles.itemAmount, { color: colors.foreground }]}>₹{item.subtotal.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Pickup Date */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Pickup Deadline</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
            onPress={() => setShowDateModal(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.dateBtnText, { color: colors.primary }]}>
              {pickupDeadline.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}{' '}
              {pickupDeadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Default: +72 hours from now</Text>
        </View>

        {/* Discounts */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Discount</Text>
          <View style={styles.discountTypeRow}>
            {(['none', 'flat', 'percentage'] as DiscountType[]).map(dt => (
              <TouchableOpacity
                key={dt}
                style={[
                  styles.discountTypeBtn,
                  discountType === dt
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => { setDiscountType(dt); setDiscountValue(''); }}
              >
                <Text style={[styles.discountTypeBtnText, { color: discountType === dt ? '#fff' : colors.foreground }]}>
                  {dt === 'none' ? 'None' : dt === 'flat' ? 'Flat ₹' : 'Percentage %'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {discountType !== 'none' && (
            <TextInput
              style={[styles.discountInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder={discountType === 'flat' ? 'Enter flat discount amount' : 'Enter percentage (e.g. 10)'}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={discountValue}
              onChangeText={setDiscountValue}
            />
          )}
        </View>

        {/* Financial Summary */}
        {orderItems.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Financial Summary</Text>
            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>Gross Amount</Text>
              <Text style={[styles.finValue, { color: colors.foreground }]}>₹{grossAmount.toFixed(2)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.finRow}>
                <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>Discount</Text>
                <Text style={[styles.finValue, { color: colors.destructive }]}>-₹{discountAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>CGST (9%)</Text>
              <Text style={[styles.finValue, { color: colors.foreground }]}>₹{cgst.toFixed(2)}</Text>
            </View>
            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { color: colors.mutedForeground }]}>SGST (9%)</Text>
              <Text style={[styles.finValue, { color: colors.foreground }]}>₹{sgst.toFixed(2)}</Text>
            </View>
            <View style={[styles.finRow, styles.finTotal, { borderTopColor: colors.border }]}>
              <Text style={[styles.finTotalLabel, { color: colors.foreground }]}>Net Payable</Text>
              <Text style={[styles.finTotalValue, { color: colors.primary }]}>₹{netPayable.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Order Note (Optional)</Text>
          <TextInput
            style={[styles.noteInput, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="Any special instructions..."
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>Create Order</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Item Modal */}
      <Modal visible={itemModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{itemModal.itemName}</Text>
            <Text style={[styles.modalCategory, { color: colors.mutedForeground }]}>{itemModal.category}</Text>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Service Type</Text>
            <View style={styles.serviceGrid}>
              {SERVICE_TYPES.map(st => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.serviceBtn,
                    modalService === st
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => { setModalService(st); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.serviceBtnText, { color: modalService === st ? '#fff' : colors.foreground }]}>{st}</Text>
                  <Text style={[styles.serviceBtnRate, { color: modalService === st ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]}>
                    {getRateLabel(itemModal.itemName, st)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Weight (KG)</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
                  keyboardType="decimal-pad"
                  value={modalKg}
                  onChangeText={setModalKg}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Quantity (Pcs)</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
                  keyboardType="number-pad"
                  value={modalQty}
                  onChangeText={setModalQty}
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <View style={[styles.subtotalBar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>Item Subtotal</Text>
              <Text style={[styles.subtotalValue, { color: colors.primary }]}>₹{modalSubtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setItemModal({ visible: false, category: 'Men', itemName: '' })}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAddBtn, { backgroundColor: colors.primary }]}
                onPress={addItemToOrder}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.modalAddText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date/Time Modal */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Set Pickup Deadline</Text>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Quick Presets</Text>
            <View style={styles.presetGrid}>
              {QUICK_PRESETS.map(p => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.presetBtn, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
                  onPress={() => applyPreset(p.minutes)}
                >
                  <Text style={[styles.presetBtnText, { color: colors.primary }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Custom Date & Time</Text>
            <View style={styles.customDateRow}>
              {[
                { label: 'Day', value: customDate.day, key: 'day', max: 2 },
                { label: 'Month', value: customDate.month, key: 'month', max: 2 },
                { label: 'Year', value: customDate.year, key: 'year', max: 4 },
                { label: 'Hour', value: customDate.hour, key: 'hour', max: 2 },
                { label: 'Min', value: customDate.minute, key: 'minute', max: 2 },
              ].map(f => (
                <View key={f.key} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[{ fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.customDateInput, { borderColor: colors.border, color: colors.foreground }]}
                    keyboardType="number-pad"
                    maxLength={f.max}
                    value={f.value}
                    onChangeText={t => setCustomDate(prev => ({ ...prev, [f.key]: t }))}
                  />
                </View>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAddBtn, { backgroundColor: colors.primary }]}
                onPress={applyCustomDate}
              >
                <Text style={styles.modalAddText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  selectedCustomer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5 },
  selCustName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  selCustMobile: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  dropDown: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 6 },
  dropItem: { padding: 12, borderBottomWidth: 1 },
  dropName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  dropMobile: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  categoryTabs: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  catTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  catTabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  garmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  garmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  garmentText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  itemName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  itemSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  itemAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1.5 },
  dateBtnText: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 },
  discountTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  discountTypeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  discountTypeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  discountInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  finLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  finValue: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  finTotal: { borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  finTotalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  finTotalValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', height: 80, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  modalCategory: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, minWidth: '45%', alignItems: 'center' },
  serviceBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  serviceBtnRate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  modalInputsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtotalBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, marginTop: 16 },
  subtotalLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  subtotalValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, borderWidth: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  modalAddBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
  modalAddText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  customDateRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  customDateInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center', width: '100%' },
});
