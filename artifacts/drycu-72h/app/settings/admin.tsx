import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp, StoreInfoData } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Customer, DiscountType, Order, OrderStatus, PickupMode } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  const colors = useColors();
  return (
    <View style={[ss.sectionHeader, { backgroundColor: colors.primary }]}>
      <Ionicons name={icon as any} size={16} color="#fff" />
      <Text style={ss.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FieldRow({
  label, value, onChangeText, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'url' | 'email-address';
}) {
  const colors = useColors();
  return (
    <View style={ss.fieldRow}>
      <Text style={[ss.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          ss.fieldInput,
          { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted },
          multiline && { height: 70, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

// ─── Order edit modal ────────────────────────────────────────────────────────

interface OrderEditState {
  status: OrderStatus;
  pickupMode: PickupMode;
  pickupDeadline: string; // ISO string
  advancePaid: string;
  discountType: DiscountType;
  discountValue: string;
  bookedBy: string;
  note: string;
}

function OrderEditModal({
  order,
  visible,
  onClose,
  onSave,
}: {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, changes: OrderEditState) => void;
}) {
  const colors = useColors();
  const [form, setForm] = useState<OrderEditState>({
    status: 'Pending', pickupMode: 'store', pickupDeadline: '',
    advancePaid: '0', discountType: 'none', discountValue: '0',
    bookedBy: '', note: '',
  });

  // Sync form when order changes
  React.useEffect(() => {
    if (order) {
      setForm({
        status:         order.status,
        pickupMode:     order.pickupMode ?? 'store',
        pickupDeadline: new Date(order.pickupDeadline).toISOString().slice(0, 16),
        advancePaid:    (order.advancePaid ?? 0).toString(),
        discountType:   order.discountType,
        discountValue:  (order.discountValue ?? 0).toString(),
        bookedBy:       order.bookedBy ?? '',
        note:           order.note ?? '',
      });
    }
  }, [order]);

  const set = (k: keyof OrderEditState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  if (!order) return null;

  const statusColor: Record<OrderStatus, string> = {
    Pending: '#F59E0B', Ready: '#10B981', Delivered: '#6B7280',
  };
  const STATUS_OPTIONS: OrderStatus[] = ['Pending', 'Ready', 'Delivered'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={ss.modalOverlay}>
        <View style={[ss.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[ss.modalHandle, { backgroundColor: colors.border }]} />
          <View style={ss.modalTitleRow}>
            <Text style={[ss.modalTitle, { color: colors.foreground }]}>Edit {order.id}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>STATUS</Text>
            <View style={ss.toggleRow}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    ss.toggleBtn,
                    form.status === s
                      ? { backgroundColor: statusColor[s] }
                      : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => setForm(f => ({ ...f, status: s }))}
                >
                  <Text style={[ss.toggleBtnText, { color: form.status === s ? '#fff' : colors.foreground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pickup Mode */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>ORDER TYPE</Text>
            <View style={ss.toggleRow}>
              {(['store', 'home'] as PickupMode[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[
                    ss.toggleBtn,
                    form.pickupMode === m
                      ? { backgroundColor: m === 'home' ? '#10B981' : colors.primary }
                      : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => setForm(f => ({ ...f, pickupMode: m }))}
                >
                  <Ionicons
                    name={m === 'home' ? 'home-outline' : 'storefront-outline'}
                    size={14}
                    color={form.pickupMode === m ? '#fff' : colors.foreground}
                  />
                  <Text style={[ss.toggleBtnText, { color: form.pickupMode === m ? '#fff' : colors.foreground }]}>
                    {m === 'home' ? 'Home Pickup' : 'Store Visit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pickup Deadline */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>PICKUP DEADLINE (YYYY-MM-DDTHH:MM)</Text>
            <TextInput
              style={[ss.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
              value={form.pickupDeadline}
              onChangeText={set('pickupDeadline')}
              placeholder="2026-07-10T18:00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
            />

            {/* Discount */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>DISCOUNT TYPE</Text>
            <View style={ss.toggleRow}>
              {(['none', 'flat', 'percentage'] as DiscountType[]).map(dt => (
                <TouchableOpacity
                  key={dt}
                  style={[
                    ss.toggleBtn,
                    form.discountType === dt
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => setForm(f => ({ ...f, discountType: dt }))}
                >
                  <Text style={[ss.toggleBtnText, { color: form.discountType === dt ? '#fff' : colors.foreground }]}>
                    {dt === 'none' ? 'None' : dt === 'flat' ? 'Flat ₹' : '% Off'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.discountType !== 'none' && (
              <TextInput
                style={[ss.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted, marginTop: 8 }]}
                value={form.discountValue}
                onChangeText={set('discountValue')}
                keyboardType="decimal-pad"
                placeholder={form.discountType === 'flat' ? 'Amount (₹)' : 'Percentage (%)'}
                placeholderTextColor={colors.mutedForeground}
              />
            )}

            {/* Advance */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>ADVANCE PAID (₹)</Text>
            <TextInput
              style={[ss.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
              value={form.advancePaid}
              onChangeText={set('advancePaid')}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.mutedForeground}
            />

            {/* Booked By */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>BOOKED BY</Text>
            <TextInput
              style={[ss.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
              value={form.bookedBy}
              onChangeText={set('bookedBy')}
              placeholderTextColor={colors.mutedForeground}
              placeholder="Staff name"
              autoCapitalize="characters"
            />

            {/* Note */}
            <Text style={[ss.modalLabel, { color: colors.mutedForeground }]}>ORDER NOTE</Text>
            <TextInput
              style={[ss.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted, height: 70, textAlignVertical: 'top' }]}
              value={form.note}
              onChangeText={set('note')}
              multiline
              placeholderTextColor={colors.mutedForeground}
              placeholder="Special instructions..."
            />

            <View style={ss.modalBtns}>
              <TouchableOpacity style={[ss.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[ss.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => onSave(order.id, form)}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={ss.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Customer edit modal ─────────────────────────────────────────────────────

function CustomerEditModal({
  customer,
  visible,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: { name: string; mobile: string; address: string }) => void;
}) {
  const colors = useColors();
  const [name,    setName]    = useState('');
  const [mobile,  setMobile]  = useState('');
  const [address, setAddress] = useState('');

  React.useEffect(() => {
    if (customer) {
      setName(customer.name);
      setMobile(customer.mobile);
      setAddress(customer.address ?? '');
    }
  }, [customer]);

  if (!customer) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={ss.modalOverlay}>
        <View style={[ss.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[ss.modalHandle, { backgroundColor: colors.border }]} />
          <View style={ss.modalTitleRow}>
            <Text style={[ss.modalTitle, { color: colors.foreground }]}>Edit Customer</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <FieldRow label="Full Name"    value={name}    onChangeText={setName} />
          <FieldRow label="Mobile"       value={mobile}  onChangeText={setMobile} keyboardType="phone-pad" />
          <FieldRow label="Address"      value={address} onChangeText={setAddress} multiline />

          <View style={ss.modalBtns}>
            <TouchableOpacity style={[ss.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[ss.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.saveBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (!name.trim() || !mobile.trim()) {
                  Alert.alert('Required', 'Name and Mobile are required.');
                  return;
                }
                onSave(customer.id, { name: name.trim(), mobile: mobile.trim(), address: address.trim() });
              }}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={ss.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const colors = useColors();
  const {
    storeInfo, updateStoreInfo,
    orders, updateOrder, deleteOrder, deleteAllOrders,
    customers, updateCustomer, deleteCustomer, deleteAllCustomers,
    factoryReset, getCustomer,
  } = useApp();

  // Store info local state
  const [si, setSi] = useState<StoreInfoData>({ ...storeInfo });
  React.useEffect(() => { setSi({ ...storeInfo }); }, [storeInfo]);
  const [siDirty, setSiDirty] = useState(false);
  const setSiField = (k: keyof StoreInfoData) => (v: string) => {
    setSi(prev => ({ ...prev, [k]: v }));
    setSiDirty(true);
  };

  // Order search + edit modal
  const [orderQuery,     setOrderQuery]     = useState('');
  const [editingOrder,   setEditingOrder]   = useState<Order | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Customer search + edit modal
  const [custQuery,      setCustQuery]      = useState('');
  const [editingCust,    setEditingCust]    = useState<Customer | null>(null);
  const [custModalOpen,  setCustModalOpen]  = useState(false);

  const filteredOrders = [...orders]
    .filter(o => {
      if (!orderQuery.trim()) return true;
      const q = orderQuery.toLowerCase();
      const c = getCustomer(o.customerId);
      return (
        o.id.toLowerCase().includes(q) ||
        c?.name.toLowerCase().includes(q) ||
        c?.mobile.includes(q) ||
        o.status.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.diNumber - a.diNumber);

  const filteredCustomers = [...customers]
    .filter(c => {
      if (!custQuery.trim()) return true;
      const q = custQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.mobile.includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleSaveStoreInfo = async () => {
    await updateStoreInfo(si);
    setSiDirty(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Store profile updated.');
  };

  const handleSaveOrder = async (id: string, form: {
    status: OrderStatus; pickupMode: PickupMode; pickupDeadline: string;
    advancePaid: string; discountType: DiscountType; discountValue: string;
    bookedBy: string; note: string;
  }) => {
    let deadline = orders.find(o => o.id === id)?.pickupDeadline ?? '';
    try {
      const d = new Date(form.pickupDeadline);
      if (!isNaN(d.getTime())) deadline = d.toISOString();
    } catch (_) {}

    await updateOrder(id, {
      status:         form.status,
      pickupMode:     form.pickupMode,
      pickupDeadline: deadline,
      advancePaid:    parseFloat(form.advancePaid) || 0,
      discountType:   form.discountType,
      discountValue:  parseFloat(form.discountValue) || 0,
      bookedBy:       form.bookedBy.trim() || undefined,
      note:           form.note.trim() || undefined,
    } as any);
    setOrderModalOpen(false);
    setEditingOrder(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteOrder = (o: Order) => {
    Alert.alert('Delete Order', `Delete ${o.id}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteOrder(o.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleSaveCustomer = async (id: string, data: { name: string; mobile: string; address: string }) => {
    await updateCustomer(id, data);
    setCustModalOpen(false);
    setEditingCust(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteCustomer = (c: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Delete ${c.name}? Their orders will remain but will show "Unknown Customer".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteCustomer(c.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const statusColor: Record<OrderStatus, string> = {
    Pending: '#F59E0B', Ready: '#10B981', Delivered: '#6B7280',
  };

  return (
    <ScrollView
      style={[ss.container, { backgroundColor: colors.background }]}
      contentContainerStyle={ss.scroll}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── 1. Store Profile ── */}
      <SectionHeader icon="storefront-outline" title="Store Profile" />
      <View style={[ss.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <FieldRow label="Store Name"      value={si.name}          onChangeText={setSiField('name')} />
        <FieldRow label="Address Line 1"  value={si.line1}         onChangeText={setSiField('line1')} />
        <FieldRow label="Address Line 2"  value={si.line2}         onChangeText={setSiField('line2')} />
        <FieldRow label="Contact Number"  value={si.contact}       onChangeText={setSiField('contact')} keyboardType="phone-pad" />
        <FieldRow label="Tagline"         value={si.tagline}       onChangeText={setSiField('tagline')} />
        <FieldRow label="Store Timing"    value={si.timing}        onChangeText={setSiField('timing')} />
        <FieldRow label="Website"         value={si.website}       onChangeText={setSiField('website')} keyboardType="url" />
        <FieldRow label="Place of Supply" value={si.placeOfSupply} onChangeText={setSiField('placeOfSupply')} />
        <TouchableOpacity
          style={[ss.primaryBtn, { backgroundColor: siDirty ? colors.primary : colors.muted }]}
          onPress={siDirty ? handleSaveStoreInfo : undefined}
          disabled={!siDirty}
        >
          <Ionicons name="save-outline" size={16} color={siDirty ? '#fff' : colors.mutedForeground} />
          <Text style={[ss.primaryBtnText, { color: siDirty ? '#fff' : colors.mutedForeground }]}>
            {siDirty ? 'Save Store Profile' : 'No Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. Orders Manager ── */}
      <SectionHeader icon="receipt-outline" title={`Orders Manager (${orders.length})`} />
      <View style={[ss.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[ss.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[ss.searchInput, { color: colors.foreground }]}
            placeholder="Search by DI no., name, mobile, status..."
            placeholderTextColor={colors.mutedForeground}
            value={orderQuery}
            onChangeText={setOrderQuery}
          />
          {orderQuery.length > 0 && (
            <TouchableOpacity onPress={() => setOrderQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {filteredOrders.length === 0 ? (
          <Text style={[ss.emptyText, { color: colors.mutedForeground }]}>No orders found</Text>
        ) : (
          filteredOrders.map(o => {
            const c = getCustomer(o.customerId);
            return (
              <View key={o.id} style={[ss.listRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[ss.listRowTitle, { color: colors.primary }]}>{o.id}</Text>
                    <View style={[ss.statusPill, { backgroundColor: statusColor[o.status] + '22' }]}>
                      <Text style={[ss.statusPillText, { color: statusColor[o.status] }]}>{o.status}</Text>
                    </View>
                    {(o as any).pickupMode === 'home' && (
                      <Ionicons name="home" size={13} color="#10B981" />
                    )}
                  </View>
                  <Text style={[ss.listRowSub, { color: colors.mutedForeground }]}>
                    {c?.name ?? 'Unknown'} · ₹{o.netPayable.toFixed(0)}
                  </Text>
                  <Text style={[ss.listRowDate, { color: colors.mutedForeground }]}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[ss.iconBtn, { backgroundColor: colors.primary + '18' }]}
                  onPress={() => { setEditingOrder(o); setOrderModalOpen(true); }}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ss.iconBtn, { backgroundColor: '#EF444422' }]}
                  onPress={() => handleDeleteOrder(o)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* ── 3. Customers Manager ── */}
      <SectionHeader icon="people-outline" title={`Customers Manager (${customers.length})`} />
      <View style={[ss.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[ss.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[ss.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or mobile..."
            placeholderTextColor={colors.mutedForeground}
            value={custQuery}
            onChangeText={setCustQuery}
          />
          {custQuery.length > 0 && (
            <TouchableOpacity onPress={() => setCustQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {filteredCustomers.length === 0 ? (
          <Text style={[ss.emptyText, { color: colors.mutedForeground }]}>No customers found</Text>
        ) : (
          filteredCustomers.map(c => (
            <View key={c.id} style={[ss.listRow, { borderBottomColor: colors.border }]}>
              <View style={[ss.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={[ss.avatarText, { color: colors.primary }]}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ss.listRowTitle, { color: colors.foreground }]}>{c.name}</Text>
                <Text style={[ss.listRowSub, { color: colors.mutedForeground }]}>{c.mobile}</Text>
                {c.address ? (
                  <Text style={[ss.listRowDate, { color: colors.mutedForeground }]} numberOfLines={1}>{c.address}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[ss.iconBtn, { backgroundColor: colors.primary + '18' }]}
                onPress={() => { setEditingCust(c); setCustModalOpen(true); }}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.iconBtn, { backgroundColor: '#EF444422' }]}
                onPress={() => handleDeleteCustomer(c)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* ── 4. Rate Settings ── */}
      <SectionHeader icon="pricetag-outline" title="Rate Settings" />
      <View style={ss.rateCards}>
        <TouchableOpacity
          style={[ss.rateCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => router.push('/settings/rates')}
        >
          <Ionicons name="shirt-outline" size={28} color={colors.primary} />
          <Text style={[ss.rateCardTitle, { color: colors.foreground }]}>Garment Rates</Text>
          <Text style={[ss.rateCardSub,   { color: colors.mutedForeground }]}>Laundry, Dry Cleaning, Press</Text>
          <Text style={[ss.rateCardArrow, { color: colors.primary }]}>Open →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ss.rateCard, { backgroundColor: colors.card, borderColor: colors.accent }]}
          onPress={() => router.push('/settings/topup')}
        >
          <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
          <Text style={[ss.rateCardTitle, { color: colors.foreground }]}>Top-Up Services</Text>
          <Text style={[ss.rateCardSub,   { color: colors.mutedForeground }]}>Stain removal, bleach, etc.</Text>
          <Text style={[ss.rateCardArrow, { color: colors.accent }]}>Open →</Text>
        </TouchableOpacity>
      </View>

      {/* ── 5. Danger Zone ── */}
      <SectionHeader icon="warning-outline" title="Danger Zone" />
      <View style={[ss.card, { backgroundColor: colors.card, borderColor: '#EF4444' }]}>
        <Text style={[ss.dangerNote, { color: colors.mutedForeground }]}>
          These actions are permanent and cannot be undone. Proceed with caution.
        </Text>

        <TouchableOpacity
          style={ss.dangerBtn}
          onPress={() =>
            Alert.alert('Delete All Orders', `Delete all ${orders.length} orders permanently?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: `Delete ${orders.length} Orders`, style: 'destructive', onPress: async () => {
                  await deleteAllOrders();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert('Done', 'All orders deleted.');
                },
              },
            ])
          }
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={ss.dangerBtnText}>Delete All Orders ({orders.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ss.dangerBtn}
          onPress={() =>
            Alert.alert('Delete All Customers', `Delete all ${customers.length} customers? Their orders will remain.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: `Delete ${customers.length} Customers`, style: 'destructive', onPress: async () => {
                  await deleteAllCustomers();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert('Done', 'All customers deleted.');
                },
              },
            ])
          }
        >
          <Ionicons name="people-outline" size={18} color="#EF4444" />
          <Text style={ss.dangerBtnText}>Delete All Customers ({customers.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[ss.dangerBtn, { backgroundColor: '#EF444415', borderRadius: 10, padding: 14 }]}
          onPress={() =>
            Alert.alert(
              '⚠️ Factory Reset',
              'This will delete ALL orders, customers, and reset all rates and store info back to defaults. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'FACTORY RESET', style: 'destructive', onPress: () =>
                    Alert.alert('Last Warning', 'There is no going back. Reset everything?', [
                      { text: 'No, Keep Data', style: 'cancel' },
                      {
                        text: 'Yes, Reset Everything', style: 'destructive', onPress: async () => {
                          await factoryReset();
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          Alert.alert('Reset Complete', 'App has been reset to factory defaults.');
                        },
                      },
                    ]),
                },
              ]
            )
          }
        >
          <Ionicons name="nuclear-outline" size={18} color="#EF4444" />
          <Text style={[ss.dangerBtnText, { fontFamily: 'Inter_700Bold' }]}>Factory Reset Everything</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <OrderEditModal
        order={editingOrder}
        visible={orderModalOpen}
        onClose={() => { setOrderModalOpen(false); setEditingOrder(null); }}
        onSave={handleSaveOrder}
      />
      <CustomerEditModal
        customer={editingCust}
        visible={custModalOpen}
        onClose={() => { setCustModalOpen(false); setEditingCust(null); }}
        onSave={handleSaveCustomer}
      />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  container: { flex: 1 },
  scroll: { gap: 0, paddingBottom: 60 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  sectionHeaderText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },

  card: { marginHorizontal: 16, marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },

  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4, textTransform: 'uppercase' },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },

  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 16 },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  listRowTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  listRowSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  listRowDate:  { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: 'Inter_700Bold' },

  rateCards: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 8 },
  rateCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 4 },
  rateCardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 6 },
  rateCardSub:   { fontSize: 12, fontFamily: 'Inter_400Regular' },
  rateCardArrow: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 4 },

  dangerNote: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EF444420' },
  dangerBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#EF4444', flex: 1 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  toggleBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
