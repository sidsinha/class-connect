import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function DebugHelper({ onResetOnboarding }) {
  // Only show in development
  if (__DEV__) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.button} onPress={onResetOnboarding}>
          <Text style={styles.buttonText}>Reset Onboarding</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
