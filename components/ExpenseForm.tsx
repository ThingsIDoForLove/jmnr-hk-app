import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useExpenseSync } from '../hooks/useExpenseSync';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ExpenseFormData {
  amount: string;
  currency: string;
  payee?: string;
  category: 'office_supplies' | 'utilities' | 'rent' | 'maintenance' | 'transportation' | 'meals' | 'events' | 'marketing' | 'equipment' | 'services' | 'other';
  description: string;
  isPersonal: boolean;
  date: Date;
}

const CURRENCIES = ['PKR'];
const CATEGORIES = [
  { label: 'دفتری سامان', value: 'office_supplies' },
  { label: 'بلز', value: 'utilities' },
  { label: 'کرایہ', value: 'rent' },
  { label: 'مرمت', value: 'maintenance' },
  { label: 'نقل و حمل', value: 'transportation' },
  { label: 'کھانا', value: 'meals' },
  { label: 'تقریبات', value: 'events' },
  { label: 'تشہیر', value: 'marketing' },
  { label: 'آلات', value: 'equipment' },
  { label: 'خدمات', value: 'services' },
  { label: 'دیگر', value: 'other' },
];

export function ExpenseForm() {
  const { saveExpense } = useExpenseSync();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    currency: 'PKR',
    category: 'office_supplies',
    description: '',
    isPersonal: false,
    date: new Date(),
  });
  const [username, setUsername] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('username').then(val => {
      if (val) setUsername(val);
    });
  }, []);

  const handleSubmit = async () => {
    if (!formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);

    try {
      await saveExpense({
        amount,
        currency: formData.currency,
        payee: username,
        category: formData.category,
        description: formData.description || undefined,
        date: formData.date.toISOString(),
        isPersonal: formData.isPersonal,
      });

      Alert.alert(
        'Success',
        'Expense saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                amount: '',
                currency: 'PKR',
                category: 'office_supplies',
                description: '',
                isPersonal: false,
                date: new Date(),
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.form}>
        {/* Amount */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle" style={{textAlign: 'right'}}>رقم *</ThemedText>
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

        {/* Category */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle" style={{textAlign: 'right'}}>قسم</ThemedText>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            disabled={isSubmitting}
          >
            <ThemedText style={styles.categoryButtonText}>
              {CATEGORIES.find(cat => cat.value === formData.category)?.label}
            </ThemedText>
          </TouchableOpacity>
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
                    setFormData(prev => ({ ...prev, category: category.value as ExpenseFormData['category'] }));
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
          <ThemedText type="subtitle" style={{textAlign: 'right'}}>تفصیل</ThemedText>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="اس خرچ کی مزید تفصیل"
            multiline
            numberOfLines={3}
            editable={!isSubmitting}
          />
        </ThemedView>

        {/* Date Field */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText type="subtitle" style={{textAlign: 'right'}}>تاریخ</ThemedText>
          <TouchableOpacity
            style={[styles.textInput, {justifyContent: 'center'}]}
            onPress={() => setShowDatePicker(true)}
            disabled={isSubmitting}
          >
            <ThemedText>
              {formData.date.toLocaleDateString()}
            </ThemedText>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setFormData(prev => ({ ...prev, date: selectedDate }));
                }
              }}
              maximumDate={new Date()}
            />
          )}
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
              خرچ محفوظ کریں
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
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
    textAlign: 'right',
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
    textAlign: 'right',
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ddd',
    position: 'relative',
  },
  toggleActive: {
    backgroundColor: '#F44336',
  },
  toggleLabel: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#F44336',
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
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#F44336',
  },
}); 