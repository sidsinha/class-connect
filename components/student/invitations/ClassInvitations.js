import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from 'react-native';

export default function ClassInvitations({ 
  invitations, 
  onAccept, 
  onDecline 
}) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <View style={styles.invitationsSection}>
      <Text style={styles.sectionTitle}>📨 Class Invitations</Text>
      {invitations.map((invitation) => (
        <View key={invitation.id} style={styles.invitationCard}>
          <View style={styles.invitationHeader}>
            <Text style={styles.invitationTitle}>{invitation.className}</Text>
            <Text style={styles.invitationInstructor}>by {invitation.instructorName}</Text>
          </View>
          <Text style={styles.invitationMessage}>{invitation.message}</Text>
          <View style={styles.invitationActions}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => onDecline(invitation)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => onAccept(invitation)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  invitationsSection: {
    backgroundColor: '#f8f9fa',
    margin: 15,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  invitationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  invitationHeader: {
    marginBottom: 8,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  invitationInstructor: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  invitationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  declineButtonText: {
    color: '#721c24',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  acceptButtonText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '500',
  },
});

