import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import authService from '../authService';

export default function EmailVerificationScreen({ onVerificationComplete }) {
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailVerification = async () => {
    try {
      setIsChecking(true);
      const currentUser = authService.getCurrentUser();
      
      if (currentUser) {
        // Reload user to get updated emailVerified status
        await currentUser.reload();
        
        if (currentUser.emailVerified) {
          Alert.alert(
            'Email Verified!', 
            'Your email has been successfully verified. You can now access your dashboard.',
            [{ text: 'Continue', onPress: onVerificationComplete }]
          );
        } else {
          Alert.alert('Not Verified', 'Please check your email and click the verification link.');
        }
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      Alert.alert('Error', 'Failed to check verification status');
    } finally {
      setIsChecking(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      setIsResending(true);
      const result = await authService.resendVerificationEmail();
      
      if (result.success) {
        Alert.alert('Email Sent', 'Verification email has been sent to your inbox. Please check your email and spam folder.');
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Error resending verification:', error);
      Alert.alert('Error', 'Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to verify your email to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Back to Login', 
          onPress: () => {
            authService.signOut();
          }
        }
      ]
    );
  };

  const currentUser = authService.getCurrentUser();
  const userEmail = currentUser?.email || 'your email';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📧</Text>
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to:
        </Text>
        <Text style={styles.email}>{userEmail}</Text>
        
        <Text style={styles.description}>
          Please check your email and click the verification link to activate your account. 
          Don't forget to check your spam folder!
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={checkEmailVerification}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>I've Verified My Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resendVerificationEmail}
            disabled={isResending}
          >
            {isResending ? (
              <ActivityIndicator color="#007bff" />
            ) : (
              <Text style={styles.secondaryButtonText}>Resend Verification Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 10,
    textAlign: 'center',
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#28a745',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  secondaryButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  logoutButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
});
