import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal
} from 'react-native';

export default function ImagePickerModal({ 
  visible, 
  onCameraPress, 
  onLibraryPress, 
  onEmojiPress, 
  onClose 
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
              onClose();
              onCameraPress();
            }}
          >
            <Text style={styles.imagePickerIcon}>📷</Text>
            <Text style={styles.imagePickerText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              onClose();
              onLibraryPress();
            }}
          >
            <Text style={styles.imagePickerIcon}>🖼️</Text>
            <Text style={styles.imagePickerText}>Choose from Library</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              onClose();
              onEmojiPress();
            }}
          >
            <Text style={styles.imagePickerIcon}>😊</Text>
            <Text style={styles.imagePickerText}>Use Emoji Avatar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelImagePicker}
            onPress={onClose}
          >
            <Text style={styles.cancelImagePickerText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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

