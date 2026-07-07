import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useLayout } from '@/hooks/useLayout';
import { Customer } from '@/types';

function CustomerCard({ customer, isWide }: { customer: Customer; isWide: boolean }) {
  const colors = useColors();
  const { getOrdersForCustomer } = useApp();
  const orderCount = getOrdersForCustomer(customer.id).length;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/customer/${customer.id}`)}
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isWide && styles.cardWide,
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.customerName, { color: colors.foreground }]}>{customer.name}</Text>
        <Text style={[styles.customerMobile, { color: colors.mutedForeground }]}>
          <Ionicons name="call-outline" size={12} /> {customer.mobile}
        </Text>
        {customer.address ? (
          <Text style={[styles.customerAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
            {customer.address}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.orderBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.orderBadgeText, { color: colors.primary }]}>{orderCount}</Text>
          <Text style={[styles.orderBadgeLabel, { color: colors.mutedForeground }]}>orders</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

export default function CustomersScreen() {
  const colors = useColors();
  const { customers } = useApp();
  const [query, setQuery] = useState('');
  const { isWide } = useLayout();

  const filtered = query.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.mobile.includes(query) ||
        c.id.toLowerCase().includes(query.toLowerCase())
      )
    : [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const webTop = !isWide && Platform.OS === 'web' ? 67 : 0;
  const numColumns = isWide ? 2 : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: webTop }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, mobile, or ID..."
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

      <FlatList
        key={isWide ? 'wide' : 'narrow'}
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        renderItem={({ item }) => <CustomerCard customer={item} isWide={isWide} />}
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
        columnWrapperStyle={isWide ? styles.columnWrapper : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No customers yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add your first customer to get started
            </Text>
          </View>
        }
        scrollEnabled={filtered.length > 0}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/customer/new');
        }}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  listWide: { paddingHorizontal: 20 },
  columnWrapper: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1,
    marginBottom: 10, gap: 12,
  },
  cardWide: { flex: 1, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  cardContent: { flex: 1, gap: 2 },
  customerName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  customerMobile: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  customerAddr: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  orderBadge: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  orderBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  orderBadgeLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
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
