import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService from '../../authService';
import EmailVerificationScreen from './EmailVerificationScreen';

export default function LoginScreen({ onLoginSuccess, preSelectedRole = null, onRoleChange = null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(preSelectedRole || 'student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const result = await authService.signIn(email.trim(), password);
      setIsLoading(false);

    if (result.success) {
      // Reload user to get latest email verification status
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await currentUser.reload();
      }
      
      // Check if email is verified - REQUIRED for login
      if (!authService.isEmailVerified()) {
        Alert.alert(
          'Email Verification Required',
          'Please check your email and click the verification link to access your dashboard. If you don\'t see the email, check your spam folder.',
          [
            { 
              text: 'Resend Email', 
              onPress: () => setShowResendVerification(true)
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }

      // Check if user's actual role matches the selected role
      const actualUserRole = authService.getUserRole();
      if (preSelectedRole && actualUserRole !== preSelectedRole) {
        Alert.alert(
          'Role Mismatch',
          `This account is registered as a ${actualUserRole === 'student' ? 'Student' : 'Instructor'}, but you selected ${preSelectedRole === 'student' ? 'Student' : 'Instructor'}. Please go back and select the correct role, or use a different account.`,
          [
            { 
              text: 'Change Role', 
              onPress: () => {
                if (onRoleChange) {
                  onRoleChange();
                }
              }
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }

      // All checks passed, proceed with login
      onLoginSuccess();
    } else {
      let errorMessage = result.error;
      
      // Handle specific Firebase auth errors
      if (result.error.includes('auth/invalid-credential')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (result.error.includes('auth/user-not-found')) {
        errorMessage = 'No account found with this email address. Please sign up first.';
      } else if (result.error.includes('auth/wrong-password')) {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (result.error.includes('auth/too-many-requests')) {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (result.error.includes('auth/user-disabled')) {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (result.error.includes('auth/network-request-failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !firstName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (First Name, Email, Password)');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      const fullName = lastName.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();
      const result = await authService.signUp(email.trim(), password, userRole, { 
        name: fullName, 
        firstName: firstName.trim(), 
        lastName: lastName.trim() || '',
        phone: phone.trim() || ''
      });
      setIsLoading(false);

    if (result.success) {
      // Show email verification screen - REQUIRED before login
      setShowEmailVerification(true);
    } else {
      let errorMessage = result.error;
      
      // Handle specific Firebase auth errors
      if (result.error.includes('email-already-in-use')) {
        errorMessage = 'This email is already registered. Please try logging in instead.';
      } else if (result.error.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (result.error.includes('auth/weak-password')) {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (result.error.includes('auth/operation-not-allowed')) {
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
      } else if (result.error.includes('auth/network-request-failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (result.error.includes('auth/too-many-requests')) {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Sign Up Failed', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!forgotPasswordEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    const result = await authService.sendPasswordReset(forgotPasswordEmail.trim());
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        'Password Reset Email Sent',
        'We\'ve sent a password reset link to your email address. Please check your inbox and spam folder.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            }
          }
        ]
      );
    } else {
      let errorMessage = result.error || 'Failed to send password reset email';
      
      // Handle specific Firebase auth errors
      if (result.error.includes('No account found with this email address')) {
        errorMessage = 'No account found with this email address. Please check your email or sign up for a new account.';
      } else if (result.error.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (result.error.includes('auth/too-many-requests')) {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (result.error.includes('auth/network-request-failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    // Check if user is logged in but email not verified
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.email === email.trim()) {
      // User is logged in, use the existing resend function
      setIsLoading(true);
      const result = await authService.resendVerificationEmail();
      setIsLoading(false);

      if (result.success) {
        Alert.alert(
          'Verification Email Sent',
          'We\'ve sent a new verification email to your inbox. Please check your email and spam folder, then try logging in again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowResendVerification(false);
              }
            }
          ]
        );
      } else {
        let errorMessage = result.error || 'Failed to send verification email';
        
        // Handle specific Firebase auth errors
        if (result.error.includes('Email is already verified')) {
          errorMessage = 'Your email is already verified. You can now log in.';
        } else if (result.error.includes('No user logged in')) {
          errorMessage = 'Please log in first before requesting verification email.';
        } else if (result.error.includes('auth/too-many-requests')) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else if (result.error.includes('auth/network-request-failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
        
        Alert.alert('Error', errorMessage);
      }
    } else {
      // User not logged in, show message to login first
      Alert.alert(
        'Login Required',
        'Please login first to resend verification email, or use the signup process if you haven\'t created an account yet.',
        [
          { text: 'OK' }
        ]
      );
    }
  };

  // Show email verification screen if needed
  if (showEmailVerification) {
    return (
      <EmailVerificationScreen 
        onVerificationComplete={() => {
          setShowEmailVerification(false);
          setIsSignUp(false); // Switch to login mode
          onLoginSuccess();
        }}
        onBackToLogin={() => {
          setShowEmailVerification(false);
          setIsSignUp(false);
          // Clear form fields
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          setPhone('');
        }}
      />
    );
  }

  // Show forgot password screen
  if (showForgotPassword) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChangeText={setForgotPasswordEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    // Clear any error states
                    setIsLoading(false);
                  }}
                >
                  <Text style={styles.backButtonText}>← Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Show resend verification screen
  if (showResendVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
              </View>
              <Text style={styles.title}>Resend Verification</Text>
              <Text style={styles.subtitle}>
                We'll send a new verification email to your registered email address.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleResendVerification}
                  disabled={isLoading}
                >
                  <Text style={styles.submitButtonText}>
                    {isLoading ? 'Sending...' : 'Resend Verification Email'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setShowResendVerification(false);
                    // Clear any error states
                    setIsLoading(false);
                  }}
                >
                  <Text style={styles.backButtonText}>← Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
            </View>
            <Text style={styles.title}>ClassConnect Pro</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account to get started' : 'Welcome back! Please sign in to continue'}
            </Text>
          </View>
        </View>

          <View style={styles.formContainer}>
            {preSelectedRole && (
              <View style={styles.roleBanner}>
                <Text style={styles.roleBannerText}>
                  Signing in as {preSelectedRole === 'student' ? 'Student' : 'Instructor'} - Only {preSelectedRole === 'student' ? 'Student' : 'Instructor'} accounts can login here
                </Text>
                {onRoleChange && (
                  <TouchableOpacity 
                    style={styles.roleBannerButton}
                    onPress={onRoleChange}
                  >
                    <Text style={styles.roleBannerButtonText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.form}>
            {isSignUp && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your first name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Last Name <Text style={styles.optionalText}>(Optional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your last name (optional)"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number <Text style={styles.optionalText}>(Optional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number (optional)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              {!isSignUp && (
                <View style={styles.linkContainer}>
                  <TouchableOpacity
                    style={styles.forgotPasswordLink}
                    onPress={() => setShowForgotPassword(true)}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resendVerificationLink}
                    onPress={() => setShowResendVerification(true)}
                  >
                    <Text style={styles.resendVerificationText}>Resend Verification Email</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isSignUp && !preSelectedRole && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Role</Text>
                  <View style={styles.roleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        userRole === 'student' && styles.roleButtonActive
                      ]}
                      onPress={() => setUserRole('student')}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        userRole === 'student' && styles.roleButtonTextActive
                      ]}>
                        Student
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        userRole === 'instructor' && styles.roleButtonActive
                      ]}
                      onPress={() => setUserRole('instructor')}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        userRole === 'instructor' && styles.roleButtonTextActive
                      ]}>
                        Instructor
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={isSignUp ? handleSignUp : handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp 
                  ? 'Already have an account? Login' 
                  : "Don't have an account? Sign Up"
                }
              </Text>
            </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  logoIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  roleBanner: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
    lineHeight: 18,
  },
  roleBannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  roleBannerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 0,
    marginHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1 }],
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingButton: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  forgotPasswordLink: {
    flex: 1,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'left',
    letterSpacing: 0.1,
  },
  resendVerificationLink: {
    flex: 1,
  },
  resendVerificationText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    letterSpacing: 0.1,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
