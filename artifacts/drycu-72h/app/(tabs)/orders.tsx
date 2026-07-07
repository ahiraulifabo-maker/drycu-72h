import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useLayout } from '@/hooks/useLayout';
import { Order, OrderStatus } from '@/types';

const STATUS_FILTERS: (OrderStatus | 'All')[] = ['All', 'Pending', 'Ready', 'Delivered'];

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

function OrderCard({ order, isWide }: { order: Order; isWide: boolean }) {
  const colors = useColors();
  const { getCustomer } = useApp();
  const customer = getCustomer(order.customerId);
  const pickupDate = new Date(order.pickupDeadline);
  const isOverdue = order.status === 'Pending' && pickupDate < new Date();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(`/order/${order.id}`)}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: isOverdue ? colors.destructive : colors.border },
        isWide && styles.cardWide,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.diNumber, { color: colors.primary }]}>{order.id}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={[styles.customerName, { color: colors.foreground }]}>
        {customer?.name ?? 'Unknown Customer'}
      </Text>
      <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{customer?.mobile}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerRow}>
          <Ionicons name="time-outline" size={13} color={isOverdue ? colors.destructive : colors.mutedForeground} />
          <Text style={[styles.footerText, { color: isOverdue ? colors.destructive : colors.mutedForeground }]}>
            {pickupDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
            {pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.foreground }]}>₹{order.netPayable.toFixed(2)}</Text>
      </View>
      <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        {(order as any).pickupMode === 'home' && (
          <Text style={{ color: colors.accent }}> · 🏠 Home</Text>
        )}
      </Text>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const { orders } = useApp();
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const { isWide } = useLayout();

  const filtered = [...orders]
    .filter(o => filter === 'All' || o.status === filter)
    .sort((a, b) => b.diNumber - a.diNumber);

  const webTop = !isWide && Platform.OS === 'web' ? 67 : 0;
  const numColumns = isWide ? 2 : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: webTop }]}>
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn,
              filter === f && { backgroundColor: colors.primary, borderRadius: 20 },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.mutedForeground }]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        key={isWide ? 'wide' : 'narrow'}
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => <OrderCard order={item} isWide={isWide} />}
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
        columnWrapperStyle={isWide ? styles.columnWrapper : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create a new order to get started
            </Text>
          </View>
        }
        scrollEnabled={filtered.length > 0}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/order/new');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  list: { padding: 16, paddingBottom: 100 },
  listWide: { paddingHorizontal: 20 },
  columnWrapper: { gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  cardWide: { flex: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diNumber: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  customerName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  mobile: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  amount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  itemCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
});
