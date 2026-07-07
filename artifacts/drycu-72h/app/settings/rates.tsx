import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
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

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, GARMENTS, RATE_CHART, SERVICE_TYPES } from '@/constants/rates';
import { GARMENT_ICONS } from '@/constants/garmentIcons';
import { ItemCategory, ServiceType } from '@/types';

const SVC_ABBR: Record<ServiceType, string> = {
  'Laundry': 'LAU',
  'Dry Cleaning': 'DC',
  'Simple Press': 'SP',
  'Steam Press': 'STP',
};

export default function RatesScreen() {
  const colors = useColors();
  const { garmentRateOverrides, updateGarmentRate, resetGarmentRate } = useApp();

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('Men');
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<{ visible: boolean; itemName: string } | null>(null);
  const [editValues, setEditValues] = useState<Partial<Record<ServiceType, string>>>({});

  const openModal = (itemName: string) => {
    const base = RATE_CHART[itemName];
    const overrides = garmentRateOverrides[itemName] ?? {};
    const vals: Partial<Record<ServiceType, string>> = {};
    SERVICE_TYPES.forEach(st => {
      const eff = overrides[st] ?? base?.[st] ?? 0;
      vals[st] = eff.toString();
    });
    setEditValues(vals);
    setModal({ visible: true, itemName });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveRates = async () => {
    if (!modal) return;
    const { itemName } = modal;
    const base = RATE_CHART[itemName];
    await Promise.all(SERVICE_TYPES.map(async st => {
      const val = parseFloat(editValues[st] ?? '');
      const defaultVal = base?.[st] ?? 0;
      if (!isNaN(val) && val !== defaultVal) {
        await updateGarmentRate(itemName, st, val);
      } else if (isNaN(val) || val === defaultVal) {
        await resetGarmentRate(itemName, st);
      }
    }));
    setModal(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetAll = (itemName: string) => {
    Alert.alert('Reset Rates', `Reset all rates for "${itemName}" to defaults?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: async () => {
          await Promise.all(SERVICE_TYPES.map(st => resetGarmentRate(itemName, st)));
          setModal(null);
        },
      },
    ]);
  };

  const garments = search.trim()
    ? Object.values(GARMENTS).flat().filter(g => g.toLowerCase().includes(search.toLowerCase()))
    : GARMENTS[activeCategory];

  const hasOverride = (itemName: string) => !!garmentRateOverrides[itemName] &&
    Object.keys(garmentRateOverrides[itemName]).length > 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Rate Chart', headerBackTitle: 'Back' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search garment..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category tabs */}
        {!search.trim() && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.tab, activeCategory === cat
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.muted }]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[styles.tabText, { color: activeCategory === cat ? '#fff' : colors.mutedForeground }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Garment list */}
        <ScrollView contentContainerStyle={styles.list}>
          {garments.map(itemName => {
            const base = RATE_CHART[itemName];
            const overrides = garmentRateOverrides[itemName] ?? {};
            const modified = hasOverride(itemName);
            return (
              <TouchableOpacity
                key={itemName}
                style={[styles.row, { backgroundColor: colors.card, borderColor: modified ? colors.warning : colors.border }]}
                onPress={() => openModal(itemName)}
              >
                <Text style={styles.emoji}>{GARMENT_ICONS[itemName] ?? '👕'}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.name, { color: colors.foreground }]}>{itemName}</Text>
                    {modified && (
                      <View style={[styles.badge, { backgroundColor: colors.warning + '33' }]}>
                        <Text style={[styles.badgeText, { color: colors.warning }]}>Custom</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {SERVICE_TYPES.map(st => {
                      const eff = overrides[st] ?? base?.[st] ?? 0;
                      if (!base || (base[st] === 0 && !overrides[st])) return null;
                      const isCustom = overrides[st] !== undefined;
                      return (
                        <Text key={st} style={[styles.rateChip, {
                          backgroundColor: isCustom ? colors.warning + '22' : colors.muted,
                          color: isCustom ? colors.warning : colors.mutedForeground,
                        }]}>
                          {SVC_ABBR[st]} ₹{eff}
                        </Text>
                      );
                    })}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Edit Modal */}
      <Modal visible={modal?.visible ?? false} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 28 }}>{GARMENT_ICONS[modal?.itemName ?? ''] ?? '👕'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{modal?.itemName}</Text>
                <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>Edit default rates</Text>
              </View>
              {modal && hasOverride(modal.itemName) && (
                <TouchableOpacity onPress={() => resetAll(modal.itemName)}>
                  <Text style={[styles.resetAll, { color: colors.destructive }]}>Reset All</Text>
                </TouchableOpacity>
              )}
            </View>

            {SERVICE_TYPES.map(st => {
              const base = RATE_CHART[modal?.itemName ?? '']?.[st] ?? 0;
              if (base === 0 && !(garmentRateOverrides[modal?.itemName ?? '']?.[st])) return null;
              const isCustom = garmentRateOverrides[modal?.itemName ?? '']?.[st] !== undefined;
              return (
                <View key={st} style={styles.editRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.editLabel, { color: colors.foreground }]}>{st}</Text>
                    <Text style={[styles.editDefault, { color: colors.mutedForeground }]}>
                      Default: ₹{base}{st === 'Laundry' ? '/kg' : '/pc'}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.editInput, {
                      borderColor: isCustom ? colors.warning : colors.border,
                      color: colors.foreground,
                    }]}
                    keyboardType="decimal-pad"
                    value={editValues[st] ?? ''}
                    onChangeText={v => setEditValues(prev => ({ ...prev, [st]: v }))}
                    placeholder={base.toString()}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              );
            })}

            <View style={styles.sheetBtns}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModal(null)}
              >
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={saveRates}
              >
                <Text style={styles.saveText}>Save Rates</Text>
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  tabs: { flexGrow: 0 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  list: { padding: 12, gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1.5,
  },
  emoji: { fontSize: 24, width: 32, textAlign: 'center' },
  name: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  rateChip: { fontSize: 11, fontFamily: 'Inter_500Medium', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  sheetSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  resetAll: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  editLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  editDefault: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  editInput: {
    width: 80, borderWidth: 1.5, borderRadius: 8, padding: 8,
    fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'right',
  },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
