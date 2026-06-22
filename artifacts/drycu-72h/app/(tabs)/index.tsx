import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
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
import { Customer, Order } from '@/types';

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function SearchResultCustomer({ c }: { c: Customer }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.searchResult, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/customer/${c.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{c.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.resultName, { color: colors.foreground }]}>{c.name}</Text>
        <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>{c.mobile}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  const colors = useColors();
  const { getCustomer } = useApp();
  const customer = getCustomer(order.customerId);
  const statusColor: Record<string, string> = {
    Pending: colors.warning,
    Ready: colors.accent,
    Delivered: colors.mutedForeground,
  };
  return (
    <TouchableOpacity
      style={[styles.recentRow, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/order/${order.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentDI, { color: colors.primary }]}>{order.id}</Text>
        <Text style={[styles.recentCustomer, { color: colors.foreground }]}>{customer?.name ?? 'Unknown'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[styles.recentAmount, { color: colors.foreground }]}>₹{order.netPayable.toFixed(0)}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor[order.status] + '22' }]}>
          <Text style={[styles.statusPillText, { color: statusColor[order.status] }]}>{order.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { customers, orders, searchCustomers } = useApp();
  const [query, setQuery] = useState('');

  const searchResults = query.trim().length >= 2 ? searchCustomers(query) : [];
  const recentOrders = [...orders].sort((a, b) => b.diNumber - a.diNumber).slice(0, 10);

  const pending = orders.filter(o => o.status === 'Pending').length;
  const ready = orders.filter(o => o.status === 'Ready').length;
  const todayRevenue = orders
    .filter(o => {
      const d = new Date(o.createdAt);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, o) => s + o.netPayable, 0);

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: webTop + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.storeName, { color: colors.primary }]}>DRYCU-72H</Text>
          <Text style={[styles.storeTagline, { color: colors.mutedForeground }]}>Laundry & Dry Cleaning POS</Text>
        </View>
        <TouchableOpacity
          style={[styles.newOrderBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/order/new'); }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newOrderBtnText}>New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search customer by name, mobile, or ID..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {query.trim().length >= 2 && (
        <View style={[styles.resultsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {searchResults.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>No customers found</Text>
              <TouchableOpacity
                style={[styles.addCustomerBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/customer/new')}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Add New Customer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            searchResults.map(c => <SearchResultCustomer key={c.id} c={c} />)
          )}
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard icon="people-outline" label="Customers" value={customers.length.toString()} color={colors.primary} />
        <StatCard icon="receipt-outline" label="Total Orders" value={orders.length.toString()} color={colors.accent} />
        <StatCard icon="time-outline" label="Pending" value={pending.toString()} color={colors.warning} />
        <StatCard icon="checkmark-circle-outline" label="Ready" value={ready.toString()} color={colors.accent} />
      </View>

      <View style={[styles.revenueCard, { backgroundColor: colors.primary }]}>
        <Ionicons name="cash-outline" size={24} color="rgba(255,255,255,0.8)" />
        <View style={{ flex: 1 }}>
          <Text style={styles.revenueLabel}>Today's Revenue</Text>
          <Text style={styles.revenueValue}>₹{todayRevenue.toFixed(2)}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/customer/new')}
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primary} />
          <Text style={[styles.quickBtnText, { color: colors.foreground }]}>New Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/order/new')}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
          <Text style={[styles.quickBtnText, { color: colors.foreground }]}>New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.map(o => <RecentOrderRow key={o.id} order={o} />)}
        </View>
      )}

      {orders.length === 0 && customers.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="storefront-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Welcome to DRYCU-72H</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Start by adding your first customer, then create their order.
          </Text>
          <TouchableOpacity
            style={[styles.getStartedBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/customer/new')}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.getStartedText}>Add First Customer</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 100, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  storeTagline: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  newOrderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  newOrderBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  resultsBox: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  searchResult: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  resultName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resultSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  noResults: { padding: 16, alignItems: 'center', gap: 12 },
  noResultsText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  addCustomerBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  revenueCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, gap: 12 },
  revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_500Medium' },
  revenueValue: { fontSize: 26, color: '#fff', fontFamily: 'Inter_700Bold', marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  section: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 10 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  seeAll: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  recentRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 10, borderBottomWidth: 1 },
  recentDI: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  recentCustomer: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  recentAmount: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  emptyState: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  getStartedBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  getStartedText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
});
