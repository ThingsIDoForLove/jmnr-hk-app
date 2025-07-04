import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSync } from '../hooks/useSync';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface DonationFormData {
  amount: string;
  currency: string;
  benefactorName: string;
  benefactorPhone: string;
  benefactorAddress?: string;
  category: 'charity' | 'zakat' | 'sadaqah' | 'other';
  description: string;
  recipient?: string;
}

const CURRENCIES = ['PKR'];
const CATEGORIES = [
  { label: 'خیرات', value: 'charity' },
  { label: 'زکوٰۃ', value: 'zakat' },
  { label: 'صدقہ', value: 'sadaqah' },
  { label: 'دیگر', value: 'other' },
];

export function DonationForm() {
  const { saveDonation } = useSync();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [formData, setFormData] = useState<DonationFormData>({
    amount: '',
    currency: 'PKR',
    benefactorName: '',
    benefactorPhone: '',
    benefactorAddress: '',
    category: 'charity',
    description: '',
  });
  const [username, setUsername] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync('username').then(val => {
      if (val) setUsername(val);
    });
  }, []);

  const handleSubmit = async () => {
    if (!formData.amount || !formData.benefactorName || !formData.benefactorPhone) {
      Alert.alert('خرابی', 'براہ کرم تمام ضروری خانے پُر کریں');
      return;
    }

    // Validate international phone number: starts with +, 11-15 digits
    if (!/^\+\d{11,15}$/.test(formData.benefactorPhone)) {
      Alert.alert('خرابی', 'براہ کرم درست فون نمبر بین الاقوامی فارمیٹ میں درج کریں، مثلاً +923001234567');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('خرابی', 'براہ کرم درست رقم درج کریں');
      return;
    }

    setIsSubmitting(true);

    try {
      await saveDonation({
        amount,
        currency: formData.currency,
        benefactorName: formData.benefactorName,
        benefactorPhone: formData.benefactorPhone,
        benefactorAddress: formData.benefactorAddress || undefined,
        category: formData.category,
        description: formData.description || undefined,
        recipient: username,
        date: new Date().toISOString(),
      });

      Alert.alert(
        'کامیابی',
        'عطیہ کامیابی سے محفوظ ہو گیا! جب انٹرنیٹ دستیاب ہوگا تو ہم آہنگ ہو جائے گا۔',
        [
          {
            text: 'ٹھیک ہے',
            onPress: () => {
              // Reset form
              setFormData({
                amount: '',
                currency: 'PKR',
                benefactorName: '',
                benefactorPhone: '',
                benefactorAddress: '',
                category: 'charity',
                description: '',
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('خرابی', 'عطیہ محفوظ کرنے میں شکست ہو چکی ہے۔ براہ کرم دوبارہ کوشش کریں۔');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.container} nestedScrollEnabled={true}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">عطیہ درج کریں</ThemedText>
      </ThemedView>

      <ThemedView style={styles.form}>
        {/* Amount */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle">رقم *</ThemedText>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              value={formData.amount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
              placeholder="0.00"
              keyboardType="numeric"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              disabled={isSubmitting}
            >
              <ThemedText style={styles.currencyButtonText}>
                {formData.currency}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {/* Currency Picker */}
          {showCurrencyPicker && (
            <ThemedView style={styles.pickerContainer}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.pickerItem,
                    formData.currency === currency && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, currency }));
                    setShowCurrencyPicker(false);
                  }}
                >
                  <ThemedText style={[
                    styles.pickerItemText,
                    formData.currency === currency && styles.pickerItemTextSelected
                  ]}>
                    {currency}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
        </ThemedView>

        {/* Benefactor Name */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle">عطیہ دہندہ کا نام *</ThemedText>
          <TextInput
            style={styles.textInput}
            value={formData.benefactorName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, benefactorName: text }))}
            placeholder="عطیہ دہندہ کا مکمل نام"
            editable={!isSubmitting}
          />
        </ThemedView>

        {/* Benefactor Phone Number */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle">عطیہ دہندہ کا فون نمبر *</ThemedText>
          <TextInput
            style={styles.textInput}
            value={formData.benefactorPhone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, benefactorPhone: text }))}
            placeholder="+92xxxxxxxxxx"
            keyboardType="phone-pad"
            editable={!isSubmitting}
            maxLength={16}
          />
        </ThemedView>

        {/* Benefactor Address (Optional) */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle">عطیہ دہندہ کا پتہ (اختیاری)</ThemedText>
          <TextInput
            style={styles.textInput}
            value={formData.benefactorAddress}
            onChangeText={(text) => setFormData(prev => ({ ...prev, benefactorAddress: text }))}
            placeholder="عطیہ دہندہ کا پتہ (اختیاری)"
            editable={!isSubmitting}
          />
        </ThemedView>

        {/* Category */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle">زمرہ</ThemedText>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            disabled={isSubmitting}
          >
            <ThemedText style={styles.categoryButtonText}>
              {CATEGORIES.find(cat => cat.value === formData.category)?.label}
            </ThemedText>
          </TouchableOpacity>
          
          {/* Category Picker */}
          {showCategoryPicker && (
            <ThemedView style={styles.pickerContainer}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.pickerItem,
                    formData.category === category.value && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, category: category.value as 'charity' | 'zakat' | 'sadaqah' | 'other' }));
                    setShowCategoryPicker(false);
                  }}
                >
                  <ThemedText style={[
                    styles.pickerItemText,
                    formData.category === category.value && styles.pickerItemTextSelected
                  ]}>
                    {category.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
        </ThemedView>

        {/* Description */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle">تفصیل (اختیاری)</ThemedText>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="اس عطیہ کی مزید تفصیل"
            multiline
            numberOfLines={3}
            editable={!isSubmitting}
          />
        </ThemedView>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.submitButtonText}>
              عطیہ محفوظ کریں
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infoText}>
            💡 آپ کا عطیہ مقامی طور پر محفوظ ہو جائے گا اور جب انٹرنیٹ دستیاب ہوگا تو ہم آہنگ ہو جائے گا۔
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    gap: 16,
  },
  form: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  currencyButton: {
    width: 80,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  categoryButtonText: {
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#007AFF',
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1976D2',
  },
}); 