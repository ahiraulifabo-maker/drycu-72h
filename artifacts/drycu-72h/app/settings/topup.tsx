import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
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
import { DEFAULT_TOPUP_SERVICES } from '@/constants/topup';

export default function TopUpSettingsScreen() {
  const colors = useColors();
  const { topUpRates, updateTopUpRates } = useApp();
  const [localRates, setLocalRates] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_TOPUP_SERVICES.map(s => [s.name, (topUpRates[s.name] ?? s.defaultRate).toString()]))
  );
  const [saving, setSaving] = useState(false);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const rates = Object.fromEntries(
        DEFAULT_TOPUP_SERVICES.map(s => [s.name, parseFloat(localRates[s.name]) || 0])
      );
      await updateTopUpRates(rates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Top-Up Service rates have been updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save rates.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Rates', 'Reset all rates to default values?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          const defaults = Object.fromEntries(
            DEFAULT_TOPUP_SERVICES.map(s => [s.name, s.defaultRate.toString()])
          );
          setLocalRates(defaults);
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Top-Up Service Rates',
          headerRight: () => (
            <TouchableOpacity onPress={handleReset}>
              <Text style={{ color: colors.warning, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                Reset
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Set the default price for each Top-Up Service. These rates will be used when creating new orders.
            </Text>
          </View>

          <View style={[styles.grid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {DEFAULT_TOPUP_SERVICES.map((service, idx) => (
              <View
                key={service.name}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  idx === DEFAULT_TOPUP_SERVICES.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.serviceIcon}>{service.icon}</Text>
                <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
                <View style={[styles.rateInputWrap, { borderColor: colors.border }]}>
                  <Text style={[styles.rupeeSign, { color: colors.mutedForeground }]}>₹</Text>
                  <TextInput
                    style={[styles.rateInput, { color: colors.foreground }]}
                    value={localRates[service.name] ?? '0'}
                    onChangeText={v => setLocalRates(prev => ({ ...prev, [service.name]: v }))}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.mutedForeground : colors.accent }]}
            onPress={handleSaveAll}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save All Rates'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  grid: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  serviceIcon: { fontSize: 22 },
  serviceName: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    minWidth: 90,
  },
  rupeeSign: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  rateInput: { fontSize: 16, fontFamily: 'Inter_700Bold', minWidth: 60, textAlign: 'right' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
