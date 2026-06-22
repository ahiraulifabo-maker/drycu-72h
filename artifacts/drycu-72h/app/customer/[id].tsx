import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { Order } from '@/types';

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function SmallOrderCard({ order }: { order: Order }) {
  const colors = useColors();
  const statusColor: Record<string, string> = {
    Pending: colors.warning,
    Ready: colors.accent,
    Delivered: colors.mutedForeground,
  };
  return (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: colors.muted, borderColor: colors.border }]}
      onPress={() => router.push(`/order/${order.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.orderDI, { color: colors.primary }]}>{order.id}</Text>
        <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
          {new Date(order.createdAt).toLocaleDateString('en-IN')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[styles.orderAmount, { color: colors.foreground }]}>₹{order.netPayable.toFixed(0)}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor[order.status] + '22' }]}>
          <Text style={[styles.statusPillText, { color: statusColor[order.status] }]}>{order.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { getCustomer, updateCustomer, deleteCustomer, getOrdersForCustomer } = useApp();
  const customer = getCustomer(id);
  const orders = getOrdersForCustomer(id);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(customer?.name ?? '');
  const [mobile, setMobile] = useState(customer?.mobile ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [secondaryMobile, setSecondaryMobile] = useState(customer?.secondaryMobile ?? '');
  const [village, setVillage] = useState(customer?.village ?? '');
  const [pinCode, setPinCode] = useState(customer?.pinCode ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [specialNote, setSpecialNote] = useState(customer?.specialNote ?? '');

  if (!customer) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Customer not found.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert('Required', 'Name, mobile and address are required.');
      return;
    }
    await updateCustomer(id, {
      name: name.trim(), mobile: mobile.trim(), address: address.trim(),
      secondaryMobile: secondaryMobile.trim() || undefined,
      village: village.trim() || undefined,
      pinCode: pinCode.trim() || undefined,
      email: email.trim() || undefined,
      specialNote: specialNote.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Customer', `Delete ${customer.name}? This will not delete their orders.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomer(id);
          router.back();
        },
      },
    ]);
  };

  const totalSpend = orders.reduce((s, o) => s + o.netPayable, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: customer.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={() => setEditing(!editing)}>
                <Ionicons name={editing ? 'close' : 'create-outline'} size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.headerName}>{customer.name}</Text>
            <Text style={styles.headerId}>ID: {customer.id.slice(0, 16)}...</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{orders.length}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹{totalSpend.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
            </View>
          </View>

          {editing ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Edit Profile</Text>
              {[
                { label: 'Full Name', value: name, set: setName, kb: 'default' as const },
                { label: 'Mobile', value: mobile, set: setMobile, kb: 'phone-pad' as const },
                { label: 'Address', value: address, set: setAddress, kb: 'default' as const },
                { label: 'Secondary Mobile', value: secondaryMobile, set: setSecondaryMobile, kb: 'phone-pad' as const },
                { label: 'Village', value: village, set: setVillage, kb: 'default' as const },
                { label: 'Pin Code', value: pinCode, set: setPinCode, kb: 'numeric' as const },
                { label: 'Email', value: email, set: setEmail, kb: 'email-address' as const },
                { label: 'Special Note', value: specialNote, set: setSpecialNote, kb: 'default' as const },
              ].map(f => (
                <View key={f.label} style={{ marginBottom: 10 }}>
                  <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.editInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={f.value}
                    onChangeText={f.set}
                    keyboardType={f.kb}
                    autoCapitalize={f.kb === 'email-address' ? 'none' : 'words'}
                  />
                </View>
              ))}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Contact Details</Text>
              <InfoRow icon="call-outline" label="Primary Mobile" value={customer.mobile} />
              <InfoRow icon="call-outline" label="Secondary Mobile" value={customer.secondaryMobile} />
              <InfoRow icon="mail-outline" label="Email" value={customer.email} />
              <InfoRow icon="location-outline" label="Address" value={customer.address} />
              <InfoRow icon="map-outline" label="Village / Area" value={customer.village} />
              <InfoRow icon="pin-outline" label="Pin Code" value={customer.pinCode} />
              <InfoRow icon="document-text-outline" label="Special Note" value={customer.specialNote} />
            </View>
          )}

          <View style={styles.newOrderRow}>
            <TouchableOpacity
              style={[styles.newOrderBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/order/new', params: { customerId: customer.id } })}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.newOrderBtnText}>New Order for this Customer</Text>
            </TouchableOpacity>
          </View>

          {orders.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Order History</Text>
              {orders.map(o => <SmallOrderCard key={o.id} order={o} />)}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  header: { padding: 24, alignItems: 'center', gap: 8 },
  headerAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 32, color: '#fff', fontFamily: 'Inter_700Bold' },
  headerName: { fontSize: 22, color: '#fff', fontFamily: 'Inter_700Bold' },
  headerId: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 8 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, color: '#fff', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { margin: 16, borderRadius: 14, borderWidth: 1, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 2 },
  editLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: 'Inter_400Regular' },
  saveBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  newOrderRow: { paddingHorizontal: 16, marginBottom: 8 },
  newOrderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  newOrderBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  orderCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  orderDI: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  orderDate: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  orderAmount: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
