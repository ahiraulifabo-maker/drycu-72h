import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function StoreSyncScreen() {
  const colors = useColors();
  const { storeId, syncStatus, lastSyncedAt, storeInfo, createNewStore, joinStore, pullLatest, leaveStore } = useApp();

  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<null | {
    action: 'join' | 'leave';
    title: string;
    message: string;
    confirmLabel: string;
  }>(null);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const code = await createNewStore(storeInfo.name);
      setCreatedCode(code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Check your connection and try again.';
      showMessage('Code not created', detail);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (busy || !code) return;
    setConfirmation({
      action: 'join',
      title: 'Join Store',
      message: `This will replace all data on this device with store code "${code}", including its printer calibration. This cannot be undone.`,
      confirmLabel: 'Replace & Join',
    });
  };

  const handleConfirm = async () => {
    if (!confirmation || busy) return;
    const action = confirmation.action;
    setConfirmation(null);
    setBusy(true);
    try {
      if (action === 'join') {
        await joinStore(joinCode.trim().toUpperCase());
        setJoinCode('');
      } else {
        await leaveStore();
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The server could not be reached.';
      showMessage(action === 'join' ? 'Could not join store' : 'Could not unlink device', message);
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    const code = createdCode ?? storeId;
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showMessage('Could not copy code', `Please select and copy ${code} manually.`);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      await pullLatest();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      showMessage('Error', 'Could not reach the server. Check your internet connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    if (busy) return;
    setConfirmation({
      action: 'leave',
      title: 'Unlink This Device',
      message: 'This device will stop syncing. The store code will keep working on any other device — your local and server data will not be deleted.',
      confirmLabel: 'Unlink',
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Store Sync' }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              The app normally works fully offline on this device. Pairing with a Store Code lets another device
              open the same customers, orders, rates, store details, and printer calibration. Each shop/franchise
              should use its own separate code.
            </Text>
          </View>

          {createdCode || storeId ? (
            <>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {createdCode ? 'Store Code Generated' : "This Store's Code"}
                </Text>
                <Text style={[styles.code, { color: colors.foreground }]}>{createdCode ?? storeId}</Text>
                <TouchableOpacity
                  style={[styles.copyBtn, { backgroundColor: copied ? colors.accent : colors.primary }]}
                  onPress={handleCopy}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
                  <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy Code'}</Text>
                </TouchableOpacity>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Enter this code on your other phone (Settings → Store Sync → Join Existing Store) to open the
                  same shop data and printer calibration there. After changing calibration, use Pull Latest on the
                  phone to load the newest settings.
                </Text>
              </View>

              <View style={[styles.statusRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusLabel, { color: colors.foreground }]}>
                    {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'error' ? 'Sync failed (offline?)' : 'Synced'}
                  </Text>
                  <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
                    Last synced {timeAgo(lastSyncedAt)}
                  </Text>
                </View>
                {syncStatus === 'syncing' || busy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <TouchableOpacity onPress={handleSyncNow} style={[styles.syncNowBtn, { borderColor: colors.primary }]}>
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={[styles.syncNowText, { color: colors.primary }]}>Pull Latest</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.leaveBtn, { borderColor: colors.destructive }]}
                onPress={handleLeave}
                disabled={busy}
              >
                <Ionicons name="unlink-outline" size={16} color={colors.destructive} />
                <Text style={[styles.leaveBtnText, { color: colors.destructive }]}>Unlink This Device</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Create a Store Code</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                  Generates a new code for "{storeInfo.name}" and uploads this device's current data and printer
                  calibration. Create it on the computer, then enter it on the phone.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Create New Store Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Join Existing Store</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                  Enter the code shown on this shop's other phone. This will replace all data on this device.
                </Text>
                <TextInput
                  style={[styles.codeInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="e.g. DRY-7F3K9Q"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: joinCode.trim() ? 1 : 0.5 }]}
                  onPress={handleJoin}
                  disabled={busy || !joinCode.trim()}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Join & Replace This Device's Data</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={confirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmation(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{confirmation?.title}</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{confirmation?.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, { borderColor: colors.border }]}
                onPress={() => setConfirmation(null)}
                disabled={busy}
              >
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.destructive }]}
                onPress={handleConfirm}
                disabled={busy}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold' }}>
                  {busy ? 'Working…' : confirmation?.confirmLabel}
                </Text>
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
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  code: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginTop: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  copyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  statusLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  statusSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  syncNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  syncNowText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  leaveBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  codeInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' },
  confirmCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12, maxWidth: 460, width: '100%', alignSelf: 'center' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  confirmButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
