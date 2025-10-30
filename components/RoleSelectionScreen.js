import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function RoleSelectionScreen({ onRoleSelected }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    // Add haptic feedback or animation here if desired
  };

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelected(selectedRole);
    }
  };

  const roles = [
    {
      id: 'student',
      title: 'Student',
      subtitle: 'I want to join classes and learn',
      description: 'Access course materials, track attendance, and stay connected with your instructors.',
      icon: '🎓',
      color: '#3b82f6',
      gradient: ['#3b82f6', '#1d4ed8'],
    },
    {
      id: 'instructor',
      title: 'Instructor',
      subtitle: 'I want to teach and manage classes',
      description: 'Create classes, manage students, track attendance, and share resources.',
      icon: '👨‍🏫',
      color: '#10b981',
      gradient: ['#10b981', '#059669'],
    },
  ];


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
          </View>
          <Text style={styles.title}>Welcome to ClassConnect Pro</Text>
          <Text style={styles.subtitle}>Choose your role to get started</Text>
        </View>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <Animated.View 
              key={role.id} 
              style={[
                styles.roleCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  borderColor: selectedRole === role.id ? role.color : '#e2e8f0',
                  borderWidth: selectedRole === role.id ? 2 : 1,
                },
              ]}
            >
              <TouchableOpacity 
                style={[
                  styles.roleButton,
                  selectedRole === role.id && styles.roleButtonSelected,
                ]}
                onPress={() => handleRoleSelect(role.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: role.color + '15' }]}>
                  <Text style={styles.roleIcon}>{role.icon}</Text>
                </View>
                
                <View style={styles.roleContent}>
                  <Text style={[styles.roleTitle, { color: selectedRole === role.id ? role.color : '#1e293b' }]}>
                    {role.title}
                  </Text>
                  <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>

                {selectedRole === role.id && (
                  <View style={[styles.checkmark, { backgroundColor: role.color }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedRole && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.continueButtonText,
              !selectedRole && styles.continueButtonTextDisabled,
            ]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  rolesContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  roleButton: {
    padding: 24,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roleButtonSelected: {
    backgroundColor: '#f8fafc',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleIcon: {
    fontSize: 32,
  },
  roleContent: {
    flex: 1,
    marginLeft: 16,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
    color: '#1e293b',
  },
  roleSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  continueButtonTextDisabled: {
    color: '#ffffff',
  },
});
