import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Modal,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dataService from '../dataService';
import authService from '../authService';

export default function StudentProfile({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [profileImage, setProfileImage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Available avatars
  const avatars = [
    '👤', '👨', '👩', '🧑', '👦', '👧', '👨‍🎓', '👩‍🎓', 
    '👨‍💼', '👩‍💼', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '👨‍⚕️', '👩‍⚕️',
    '🦸', '🦸‍♀️', '🦸‍♂️', '🧙', '🧙‍♀️', '🧙‍♂️', '🧚', '🧚‍♀️', '🧚‍♂️'
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const pickImage = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to add your profile picture',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openImageLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = () => {
    // For now, we'll simulate camera functionality
    // In a real app, you'd use react-native-image-picker
    Alert.alert('Camera', 'Camera functionality would be implemented here with react-native-image-picker');
  };

  const openImageLibrary = () => {
    // For now, we'll simulate library functionality
    // In a real app, you'd use react-native-image-picker
    Alert.alert('Photo Library', 'Photo library functionality would be implemented here with react-native-image-picker');
  };

  const removeProfileImage = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setProfileImage(null) }
      ]
    );
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if phone has 10-15 digits (international format)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  };

  const validateForm = () => {
    const errors = {};

    // First name validation
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but if provided, must be valid)
    if (phone.trim() && !validatePhone(phone.trim())) {
      errors.phone = 'Please enter a valid phone number (10-15 digits)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'User not found');
        onBack();
        return;
      }

      const userProfile = await dataService.getUserProfile(currentUser.uid);
      if (userProfile) {
        setProfile(userProfile);
        setFirstName(userProfile.firstName || userProfile.name?.split(' ')[0] || '');
        setLastName(userProfile.lastName || userProfile.name?.split(' ').slice(1).join(' ') || '');
        setEmail(userProfile.email || '');
        setPhone(userProfile.phone || '');
        setSelectedAvatar(userProfile.avatar || '👤');
        setProfileImage(userProfile.profileImage || null);
      } else {
        // Create a basic profile if none exists
        const basicProfile = {
          id: currentUser.uid,
          name: currentUser.displayName || 'Student',
          email: currentUser.email || '',
          phone: '',
          avatar: '👤',
          role: 'student'
        };
        setProfile(basicProfile);
        setFirstName(basicProfile.name.split(' ')[0] || '');
        setLastName(basicProfile.name.split(' ').slice(1).join(' ') || '');
        setEmail(basicProfile.email);
        setPhone(basicProfile.phone);
        setSelectedAvatar(basicProfile.avatar);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Validate form before saving
      if (!validateForm()) {
        setIsSaving(false);
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const updatedProfile = {
        ...profile,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: selectedAvatar,
        profileImage: profileImage,
        updatedAt: new Date().toISOString()
      };

      // Save to Firebase
      if (dataService.isOnline) {
        await dataService.updateUserProfile(currentUser.uid, updatedProfile);
      }

      // Save locally
      await dataService.saveUserProfileLocally(updatedProfile);
      
      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form to original values
    setFirstName(profile?.firstName || profile?.name?.split(' ')[0] || '');
    setLastName(profile?.lastName || profile?.name?.split(' ').slice(1).join(' ') || '');
    setEmail(profile?.email || '');
    setPhone(profile?.phone || '');
    setSelectedAvatar(profile?.avatar || '👤');
    setValidationErrors({});
    setIsEditing(false);
  };

  // Real-time validation handlers
  const handleFirstNameChange = (text) => {
    setFirstName(text);
    if (validationErrors.firstName) {
      setValidationErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (text) => {
    setLastName(text);
    if (validationErrors.lastName) {
      setValidationErrors(prev => ({ ...prev, lastName: '' }));
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (validationErrors.email) {
      setValidationErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePhoneChange = (text) => {
    setPhone(text);
    if (validationErrors.phone) {
      setValidationErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const renderAvatarModal = () => (
    <Modal
      visible={showAvatarModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.avatarModal}>
          <Text style={styles.avatarModalTitle}>Choose Avatar</Text>
          <ScrollView style={styles.avatarGrid}>
            <View style={styles.avatarRow}>
              {avatars.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === avatar && styles.selectedAvatarOption
                  ]}
                  onPress={() => {
                    setSelectedAvatar(avatar);
                    setShowAvatarModal(false);
                  }}
                >
                  <Text style={styles.avatarText}>{avatar}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={styles.closeAvatarModal}
            onPress={() => setShowAvatarModal(false)}
          >
            <Text style={styles.closeAvatarModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderImagePickerModal = () => (
    <Modal
      visible={showImagePicker}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.imagePickerModal}>
          <Text style={styles.imagePickerTitle}>Add Profile Picture</Text>
          <Text style={styles.imagePickerSubtitle}>
            Choose how you want to add your profile picture
          </Text>
          
          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              setShowImagePicker(false);
              openCamera();
            }}
          >
            <Text style={styles.imagePickerIcon}>📷</Text>
            <Text style={styles.imagePickerText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              setShowImagePicker(false);
              openImageLibrary();
            }}
          >
            <Text style={styles.imagePickerIcon}>🖼️</Text>
            <Text style={styles.imagePickerText}>Choose from Library</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              setShowImagePicker(false);
              setShowAvatarModal(true);
            }}
          >
            <Text style={styles.imagePickerIcon}>😊</Text>
            <Text style={styles.imagePickerText}>Use Emoji Avatar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelImagePicker}
            onPress={() => setShowImagePicker(false)}
          >
            <Text style={styles.cancelImagePickerText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight}>
          {!isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => isEditing && setShowImagePicker(true)}
            disabled={!isEditing}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <Text style={styles.avatar}>{selectedAvatar}</Text>
            )}
            {isEditing && (
              <View style={styles.avatarEditOverlay}>
                <Text style={styles.avatarEditText}>
                  {profileImage ? 'Tap to change photo' : 'Tap to add photo'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatarActions}>
            <Text style={styles.avatarLabel}>
              {isEditing ? 'Tap to add/change photo' : 'Profile Picture'}
            </Text>
            {isEditing && profileImage && (
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={removeProfileImage}
              >
                <Text style={styles.removeImageText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
            {isEditing && !profileImage && (
              <TouchableOpacity 
                style={styles.emojiAvatarButton}
                onPress={() => setShowAvatarModal(true)}
              >
                <Text style={styles.emojiAvatarText}>Use Emoji Instead</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>First Name</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={[
                    styles.infoInput,
                    validationErrors.firstName && styles.errorInput
                  ]}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                />
                {validationErrors.firstName && (
                  <Text style={styles.errorText}>{validationErrors.firstName}</Text>
                )}
              </>
            ) : (
              <Text style={styles.infoValue}>{profile?.firstName || profile?.name?.split(' ')[0] || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Name</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={[
                    styles.infoInput,
                    validationErrors.lastName && styles.errorInput
                  ]}
                  value={lastName}
                  onChangeText={handleLastNameChange}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                />
                {validationErrors.lastName && (
                  <Text style={styles.errorText}>{validationErrors.lastName}</Text>
                )}
              </>
            ) : (
              <Text style={styles.infoValue}>{profile?.lastName || profile?.name?.split(' ').slice(1).join(' ') || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={[
                    styles.infoInput,
                    validationErrors.email && styles.errorInput
                  ]}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {validationErrors.email && (
                  <Text style={styles.errorText}>{validationErrors.email}</Text>
                )}
              </>
            ) : (
              <Text style={styles.infoValue}>{profile?.email || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone (Optional)</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={[
                    styles.infoInput,
                    validationErrors.phone && styles.errorInput
                  ]}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
                {validationErrors.phone && (
                  <Text style={styles.errorText}>{validationErrors.phone}</Text>
                )}
              </>
            ) : (
              <Text style={styles.infoValue}>{profile?.phone || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Student ID</Text>
            <Text style={styles.infoValue}>{profile?.id || 'Not available'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={saveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderAvatarModal()}
      {renderImagePickerModal()}
    </SafeAreaView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 80,
    textAlign: 'center',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    borderRadius: 4,
  },
  avatarEditText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  avatarLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoItem: {
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  errorInput: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  avatarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  avatarGrid: {
    maxHeight: 300,
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarOption: {
    width: 60,
    height: 60,
    margin: 8,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  avatarText: {
    fontSize: 24,
  },
  closeAvatarModal: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeAvatarModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarActions: {
    alignItems: 'center',
    marginTop: 8,
  },
  removeImageButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc3545',
    borderRadius: 6,
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emojiAvatarButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  emojiAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  imagePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  imagePickerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  imagePickerIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cancelImagePicker: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelImagePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
