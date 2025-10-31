import React, { useState, useEffect } from 'react';

import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import authService from '../authService';
import dataService from '../dataService';

import ClassInvitations from './student/invitations';
import StudentProfile from './student/StudentProfile';

export default function StudentDashboard({ onLogout }) {
  const [classes, setClasses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMessagesScreen, setShowMessagesScreen] = useState(false);
  const [showSchedulesScreen, setShowSchedulesScreen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('messages');
  const [_studentName, setStudentName] = useState('Student');

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadStudentData is stable and doesn't need to be in deps

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Load student profile to get name
      const profile = await dataService.getUserProfile(currentUser.uid);
      if (profile && profile.firstName) {
        setStudentName(profile.firstName);
      } else if (profile && profile.name) {
        // Fallback to full name if firstName not available
        const firstName = profile.name.split(' ')[0];
        setStudentName(firstName);
      }

      // Get classes assigned to this student
      const studentClasses = await dataService.getClassesForStudent(currentUser.uid);
      setClasses(studentClasses);

      // Load pending invitations
      await loadPendingInvitations();

      // If student has classes, load messages and schedules from the first class
      if (studentClasses.length > 0) {
        setSelectedClass(studentClasses[0]);
        await loadMessages(studentClasses[0].id);
        await loadSchedules(studentClasses[0].id);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading student data:', error);
      setIsLoading(false);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const invitations = await dataService.getPendingInvitations(currentUser.uid);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const loadMessages = async (classId) => {
    try {
      const classMessages = await dataService.getMessages(classId);
      setMessages(classMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadSchedules = async (classId) => {
    try {
      const classSchedules = await dataService.getSchedules(classId);
      setSchedules(classSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudentData();
    setRefreshing(false);
  };

  const selectClass = async (classItem) => {
    setSelectedClass(classItem);
    await loadMessages(classItem.id);
    await loadSchedules(classItem.id);
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageTitle}>{item.title}</Text>
        <Text style={styles.messageDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.messageContent}>{item.content}</Text>
      <Text style={styles.messageInstructorName}>- {item.instructorName}</Text>
    </View>
  );

  const renderSchedule = ({ item }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleDate}>{new Date(item.date).toLocaleDateString()}</Text>
        <Text style={styles.scheduleTime}>
          {item.startTime} ({item.duration} minutes)
        </Text>
        {item.endTime && (
          <Text style={styles.scheduleEndTime}>Ends at: {item.endTime}</Text>
        )}
        {item.description && (
          <Text style={styles.scheduleDescription}>{item.description}</Text>
        )}
      </View>
    </View>
  );

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.classCard,
        selectedClass?.id === item.id && styles.selectedClassCard
      ]}
      onPress={() => selectClass(item)}
    >
      <Text style={[
        styles.className,
        selectedClass?.id === item.id && styles.selectedClassName
      ]}>
        {item.name}
      </Text>
      <Text style={[
        styles.instructorName,
        selectedClass?.id === item.id && styles.selectedInstructorName
      ]}>
        👨‍🏫 {item.instructorName || 'Instructor'}
      </Text>
      {item.description && (
        <Text style={styles.classDescription}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: onLogout }
      ]
    );
  };

  const acceptInvitation = async (invitation) => {
    try {
      // Update invitation status
      await dataService.updateInvitationStatus(invitation.id, 'accepted');
      
      // Enroll student in the class
      await dataService.assignStudentToClass(
        invitation.studentId,
        invitation.classId,
        { name: invitation.studentName, email: invitation.studentEmail }
      );
      
      // Remove from pending invitations immediately
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Reload only the classes data to show the new class
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const studentClasses = await dataService.getClassesForStudent(currentUser.uid);
        setClasses(studentClasses);
      }
      
      Alert.alert('Success', `You have been enrolled in ${invitation.className}!`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const declineInvitation = async (invitation) => {
    try {
      // Update invitation status
      await dataService.updateInvitationStatus(invitation.id, 'declined');
      
      // Remove from pending invitations immediately
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      Alert.alert('Info', `You have declined the invitation to ${invitation.className}`);
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show profile screen if profile is selected
  if (showProfile) {
    return <StudentProfile onBack={() => setShowProfile(false)} />;
  }

  // Show messages screen if messages screen is selected
  if (showMessagesScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowMessagesScreen(false)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Messages</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.messagesSection}>
            <Text style={styles.sectionTitle}>
              Messages {selectedClass ? `from ${selectedClass.name}` : ''}
            </Text>
            {messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <Text style={styles.emptyMessagesText}>
                  No messages yet. Check back later!
                </Text>
              </View>
            ) : (
              messages.map((item) => (
                <View key={item.id}>
                  {renderMessage({ item })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show schedules screen if schedules screen is selected
  if (showSchedulesScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowSchedulesScreen(false)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Schedules</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>
              Schedule {selectedClass ? `for ${selectedClass.name}` : ''}
            </Text>
            {schedules.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <Text style={styles.emptyMessagesText}>
                  No schedule set yet. Check back later!
                </Text>
              </View>
            ) : (
              schedules.map((item) => (
                <View key={item.id}>
                  {renderSchedule({ item })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoContainer}>
            <Text style={styles.headerLogoIcon}>🎓</Text>
            <Text style={styles.title}>Student Dashboard</Text>
          </View>
          <Text style={styles.subtitle}>View messages from your instructors</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfile(true)}>
            <Text style={styles.profileButtonText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Invitations Section */}
        <ClassInvitations
          invitations={pendingInvitations}
          onAccept={acceptInvitation}
          onDecline={declineInvitation}
        />

        {classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Classes Assigned</Text>
            <Text style={styles.emptyText}>
              You haven't been assigned to any classes yet. Contact your instructor.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.classesSection}>
              <Text style={styles.sectionTitle}>Your Classes</Text>
              <View style={styles.classesGrid}>
                {classes.map((item) => (
                  <View key={item.id} style={styles.classItemWrapper}>
                    {renderClassItem({ item })}
                  </View>
                ))}
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'messages' && styles.activeTabButton]}
                onPress={() => setActiveTab('messages')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'messages' && styles.activeTabButtonText]}>
                  📨 Messages
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'schedules' && styles.activeTabButton]}
                onPress={() => setActiveTab('schedules')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'schedules' && styles.activeTabButtonText]}>
                  📅 Schedules
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'messages' && (
                <View style={styles.messagesSection}>
                  <Text style={styles.sectionTitle}>
                    Messages {selectedClass ? `from ${selectedClass.name}` : ''}
                  </Text>
                  {messages.length === 0 ? (
                    <View style={styles.emptyMessagesContainer}>
                      <Text style={styles.emptyMessagesText}>
                        No messages yet. Check back later!
                      </Text>
                    </View>
                  ) : (
                    <>
                      {messages.slice(0, 2).map((item) => (
                        <View key={item.id}>
                          {renderMessage({ item })}
                        </View>
                      ))}
                      {messages.length > 2 && (
                        <TouchableOpacity 
                          style={styles.viewMoreButtonBottom}
                          onPress={() => setShowMessagesScreen(true)}
                        >
                          <Text style={styles.viewMoreTextBottom}>View All Messages ({messages.length})</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}

              {activeTab === 'schedules' && (
                <View style={styles.scheduleSection}>
                  <Text style={styles.sectionTitle}>
                    Schedule {selectedClass ? `for ${selectedClass.name}` : ''}
                  </Text>
                  {schedules.length === 0 ? (
                    <View style={styles.emptyMessagesContainer}>
                      <Text style={styles.emptyMessagesText}>
                        No schedule set yet. Check back later!
                      </Text>
                    </View>
                  ) : (
                    <>
                      {schedules.slice(0, 2).map((item) => (
                        <View key={item.id}>
                          {renderSchedule({ item })}
                        </View>
                      ))}
                      {schedules.length > 2 && (
                        <TouchableOpacity 
                          style={styles.viewMoreButtonBottom}
                          onPress={() => setShowSchedulesScreen(true)}
                        >
                          <Text style={styles.viewMoreTextBottom}>View All Schedules ({schedules.length})</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLogoIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  profileButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  classesSection: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 16,
  },
  classesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  classItemWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  viewMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  viewMoreButtonBottom: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewMoreTextBottom: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
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
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 60,
  },
  classesList: {
    paddingHorizontal: 20,
  },
  classCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    flex: 1,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedClassCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
    textAlign: 'center',
  },
  selectedClassName: {
    color: '#007AFF',
  },
  instructorName: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  selectedInstructorName: {
    color: '#007AFF',
  },
  classDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  messagesSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  scheduleSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  messageCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  messageDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  messageContent: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
    marginBottom: 10,
  },
  messageInstructorName: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'right',
  },
  scheduleCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  scheduleEndTime: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  scheduleDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  invitationsSection: {
    backgroundColor: '#f8f9fa',
    margin: 15,
    borderRadius: 10,
    padding: 15,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  tabContent: {
    minHeight: 200,
  },
});
