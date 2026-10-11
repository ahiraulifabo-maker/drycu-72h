import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DEFAULT_PRINTER_CALIBRATION } from '@/constants/printerCalibration';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { printCalibrationTest } from '@/utils/print';
import type { PrinterCalibration } from '@workspace/api-client-react';

const STEP_MM = 0.5;

function formatOffset(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} mm`;
}

export default function PrinterCalibrationScreen() {
  const colors = useColors();
  const { printerCalibration, updatePrinterCalibration, storeId, isLoaded } = useApp();

  const adjust = (key: keyof PrinterCalibration, amount: number) => {
    const next = Math.round((printerCalibration[key] + amount) * 10) / 10;
    void updatePrinterCalibration({ [key]: next });
  };

  const control = (title: string, key: keyof PrinterCalibration, direction: string) => (
    <View key={key} style={[styles.control, { borderColor: colors.border }]}>
      <View style={styles.controlLabel}>
        <Text style={[styles.controlTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.controlDirection, { color: colors.mutedForeground }]}>{direction}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Move ${title.toLowerCase()} left or up`}
        disabled={!isLoaded || printerCalibration[key] <= -10}
        onPress={() => adjust(key, -STEP_MM)}
        style={[styles.stepButton, { backgroundColor: colors.secondary, opacity: !isLoaded || printerCalibration[key] <= -10 ? 0.45 : 1 }]}
      >
        <Ionicons name="remove" size={20} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.offsetValue, { color: colors.foreground }]}>{formatOffset(printerCalibration[key])}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Move ${title.toLowerCase()} right or down`}
        disabled={!isLoaded || printerCalibration[key] >= 10}
        onPress={() => adjust(key, STEP_MM)}
        style={[styles.stepButton, { backgroundColor: colors.secondary, opacity: !isLoaded || printerCalibration[key] >= 10 ? 0.45 : 1 }]}
      >
        <Ionicons name="add" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const profileCard = (
    title: string,
    description: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    xKey: keyof PrinterCalibration,
    yKey: keyof PrinterCalibration,
    kind: 'tag' | 'bill',
  ) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeading}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.cardHeadingText}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>{description}</Text>
        </View>
      </View>
      {control('Horizontal offset', xKey, '+ moves right')}
      {control('Vertical offset', yKey, '+ moves down')}
      <TouchableOpacity
        style={[styles.testButton, { borderColor: colors.primary }]}
        onPress={() => printCalibrationTest(kind, printerCalibration)}
      >
        <Ionicons name="print-outline" size={17} color={colors.primary} />
        <Text style={[styles.testButtonText, { color: colors.primary }]}>Print alignment test</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Printer Calibration' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Print a test, then adjust in 0.5 mm steps until the border is centered on the paper. Positive horizontal
            values move right; positive vertical values move down. The same 80 mm bill and 38.1 mm tag formats are
            used for the tests and real prints.
          </Text>
        </View>

        {profileCard('Garment tag', '38.1 mm roll', 'pricetag-outline', 'tagOffsetXmm', 'tagOffsetYmm', 'tag')}
        {profileCard('Bill / receipt', '80 mm roll', 'receipt-outline', 'billOffsetXmm', 'billOffsetYmm', 'bill')}

        <View style={[styles.syncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.accent} />
          <View style={styles.syncCopy}>
            <Text style={[styles.syncTitle, { color: colors.foreground }]}>Use this calibration on your phone</Text>
            <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
              {storeId
                ? `This device is paired to ${storeId}. Adjustments sync to that store. On the phone, open Store Sync and tap Pull Latest.`
                : 'Create a Store Code on this computer after calibrating, then enter that code on the phone to copy this printer setup.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={() => void updatePrinterCalibration(DEFAULT_PRINTER_CALIBRATION)}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Reset all offsets to 0 mm</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, gap: 14, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardHeadingText: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  cardDescription: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, marginTop: 2 },
  control: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 8 },
  controlLabel: { flex: 1, minWidth: 112 },
  controlTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  controlDirection: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  stepButton: { width: 40, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  offsetValue: { width: 72, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  testButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1.5 },
  testButtonText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  syncCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  syncCopy: { flex: 1, gap: 3 },
  syncTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  resetText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
