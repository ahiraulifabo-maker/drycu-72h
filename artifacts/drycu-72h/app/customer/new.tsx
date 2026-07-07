import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
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

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  multiline?: boolean;
}

function Field({ label, value, onChangeText, placeholder, required, keyboardType = 'default', multiline }: FieldProps) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}{required ? <Text style={{ color: colors.destructive }}> *</Text> : ''}
      </Text>
      <TextInput
        style={[
          styles.input,
          { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
          multiline && { height: 80, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

export default function NewCustomerScreen() {
  const colors = useColors();
  const { addCustomer } = useApp();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [secondaryMobile, setSecondaryMobile] = useState('');
  const [village, setVillage] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [email, setEmail] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Customer name is required.'); return; }
    if (!mobile.trim()) { Alert.alert('Required', 'Mobile number is required.'); return; }
    if (mobile.trim().length < 10) { Alert.alert('Invalid', 'Please enter a valid mobile number.'); return; }
    if (!address.trim()) { Alert.alert('Required', 'Address is required.'); return; }

    setSaving(true);
    const result = await addCustomer({
      name: name.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      secondaryMobile: secondaryMobile.trim() || undefined,
      village: village.trim() || undefined,
      pinCode: pinCode.trim() || undefined,
      email: email.trim() || undefined,
      specialNote: specialNote.trim() || undefined,
    });
    setSaving(false);

    if (!result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'CRITICAL ERROR',
        'This customer profile already exists. Please locate their existing profile to prevent file duplication.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/customer/${result.id}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Customer', headerBackTitle: 'Cancel' }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Required Information</Text>
            <Field label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Ramesh Kumar" required />
            <Field label="Mobile Number" value={mobile} onChangeText={setMobile} placeholder="10-digit mobile" required keyboardType="phone-pad" />
            <Field label="Address" value={address} onChangeText={setAddress} placeholder="Full address" required multiline />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Optional Details</Text>
            <Field label="Secondary Mobile" value={secondaryMobile} onChangeText={setSecondaryMobile} placeholder="Alternate contact" keyboardType="phone-pad" />
            <Field label="Village / Area" value={village} onChangeText={setVillage} placeholder="Village or area name" />
            <Field label="Pin Code" value={pinCode} onChangeText={setPinCode} placeholder="6-digit pin code" keyboardType="numeric" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="customer@email.com" keyboardType="email-address" />
            <Field label="Special Note" value={specialNote} onChangeText={setSpecialNote} placeholder="Any special instructions or notes..." multiline />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.mutedForeground : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Create Customer Profile'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular' },
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
