import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';

export default function AvatarPicker({ 
  visible, 
  avatars, 
  selectedAvatar, 
  onSelect, 
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
                    onSelect(avatar);
                    onClose();
                  }}
                >
                  <Text style={styles.avatarText}>{avatar}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={styles.closeAvatarModal}
            onPress={onClose}
          >
            <Text style={styles.closeAvatarModalText}>Close</Text>
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
});

