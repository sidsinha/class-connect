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
import authService from '../../authService';

export default function EmailVerificationScreen({ onVerificationComplete, onBackToLogin }) {
  const [isResending, setIsResending] = useState(false);

  // Auto-check for email verification every 3 seconds
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            clearInterval(checkInterval);
            onVerificationComplete();
          }
        } catch (error) {
          // Silently handle errors during auto-check
        }
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [onVerificationComplete]);


  const resendVerificationEmail = async () => {
    try {
      setIsResending(true);
      
      // Get the current user directly from Firebase auth
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        Alert.alert(
          'Session Error', 
          'It looks like your session has expired. Please go back to login and try again.'
        );
        return;
      }

      // Check if email is already verified
      if (currentUser.emailVerified) {
        Alert.alert(
          'Already Verified', 
          'Your email is already verified! You can now access your dashboard.',
          [{ text: 'Continue', onPress: onVerificationComplete }]
        );
        return;
      }

      // Use authService to send verification email
      const result = await authService.resendVerificationEmail();
      
      if (result.success) {
        Alert.alert(
          'Email Sent', 
          'A new verification email has been sent to your inbox. Please check your email and spam folder.'
        );
      } else {
        // Handle specific error cases
        let errorMessage = result.error || 'Failed to send verification email.';
        
        if (result.error.includes('No user logged in')) {
          errorMessage = 'Session expired. Please go back to login and try again.';
        } else if (result.error.includes('Email is already verified')) {
          Alert.alert(
            'Already Verified', 
            'Your email is already verified! You can now access your dashboard.',
            [{ text: 'Continue', onPress: onVerificationComplete }]
          );
          return;
        } else if (result.error.includes('auth/too-many-requests')) {
          errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
        } else if (result.error.includes('auth/network-request-failed')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        'Failed to send verification email. Please check your internet connection and try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Back to Login',
      'Are you sure you want to go back to login? You can return here anytime to verify your email.',
      [
        { text: 'Stay Here', style: 'cancel' },
        { 
          text: 'Back to Login', 
            onPress: async () => {
              try {
                await authService.signOut();
                if (onBackToLogin) {
                  onBackToLogin();
                }
              } catch (error) {
                // Still call the callback even if signOut fails
                if (onBackToLogin) {
                  onBackToLogin();
                }
              }
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
          Don't forget to check your spam folder! Once you click the link, you'll be automatically redirected to your dashboard.
        </Text>

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 Tip:</Text>
          <Text style={styles.tipText}>
            If you don't see the email, try refreshing your email app or check your spam folder. 
            The verification link will expire in 24 hours.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
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
  tipContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});
