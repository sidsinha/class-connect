import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from './authService';
import OnboardingScreen from './components/onboarding/OnboardingScreen';
import RoleSelectionScreen from './components/auth/RoleSelectionScreen';
import LoginScreen from './components/auth/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import DebugHelper from './components/common/DebugHelper';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    checkOnboardingStatus();
    checkAuthState();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboarding === 'true') {
        setShowOnboarding(false);
        setShowRoleSelection(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const checkAuthState = async () => {
    try {
      // Get current user and check if email is verified
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        // Reload user to get latest emailVerified status
        await currentUser.reload();
      }
      
      // Wait a bit for auth state to initialize
      setTimeout(() => {
        const authenticated = authService.isAuthenticated();
        const role = authService.getUserRole();
        
        setIsAuthenticated(authenticated);
        setUserRole(role);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    // Force a re-check of authentication state
    await checkAuthState();
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setUserRole(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setShowOnboarding(false);
      setShowRoleSelection(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setShowOnboarding(false);
      setShowRoleSelection(true);
    }
  };

  const handleRoleSelected = (role) => {
    setSelectedRole(role);
    setShowRoleSelection(false);
  };

  const handleRoleChange = () => {
    setShowRoleSelection(true);
    setSelectedRole(null);
  };

  // For development/testing - reset onboarding
  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenOnboarding');
      setShowOnboarding(true);
      setShowRoleSelection(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  if (showOnboarding) {
    return (
      <View style={{ flex: 1 }}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <DebugHelper onResetOnboarding={resetOnboarding} />
      </View>
    );
  }

  if (showRoleSelection) {
    return (
      <View style={{ flex: 1 }}>
        <RoleSelectionScreen onRoleSelected={handleRoleSelected} />
        <DebugHelper onResetOnboarding={resetOnboarding} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          preSelectedRole={selectedRole}
          onRoleChange={handleRoleChange}
        />
        <DebugHelper onResetOnboarding={resetOnboarding} />
      </View>
    );
  }

  if (userRole === 'student') {
    return <StudentDashboard onLogout={handleLogout} />;
  }

  if (userRole === 'instructor') {
    return <InstructorDashboard onLogout={handleLogout} />;
  }

  // Fallback - should not reach here
  return (
    <View style={{ flex: 1 }}>
      <LoginScreen onLoginSuccess={handleLoginSuccess} />
      <DebugHelper onResetOnboarding={resetOnboarding} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});