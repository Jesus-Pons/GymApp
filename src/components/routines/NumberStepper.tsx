import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type NumberStepperProps = {
  label: string;
  valueText: string;
  onChangeText: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  suffix?: string;
  onBlur?: () => void;
};

export const NumberStepper = ({
  label,
  valueText,
  onChangeText,
  onDecrement,
  onIncrement,
  suffix,
  onBlur,
}: NumberStepperProps) => {
  return (
    <View style={styles.stepperBlock}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepperButton} onPress={onDecrement} activeOpacity={0.7}>
          <Text style={styles.stepperButtonText}>-</Text>
        </TouchableOpacity>

        <View style={styles.stepperInputWrap}>
          <TextInput
            style={styles.stepperInput}
            value={valueText}
            onChangeText={onChangeText}
            onBlur={onBlur}
            keyboardType="numeric"
            textAlign="center"
          />
          {!!suffix && <Text style={styles.stepperSuffix}>{suffix}</Text>}
        </View>

        <TouchableOpacity style={styles.stepperButton} onPress={onIncrement} activeOpacity={0.7}>
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepperBlock: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepperButtonText: { color: '#3B82F6', fontSize: 20, fontWeight: '700', marginTop: -1 },
  stepperInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  stepperInput: {
    flex: 1,
    color: '#111827',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 0,
    minWidth: 24,
  },
  stepperSuffix: { color: '#111827', fontSize: 16, fontWeight: '500', marginLeft: 4 },
});
