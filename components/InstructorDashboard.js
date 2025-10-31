import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Platform,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import dataService from '../dataService';
import authService from '../authService';
import InstructorProfile from './instructor/InstructorProfile';

export default function InstructorDashboard({ onLogout }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [messages, setMessages] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [viewMode, setViewMode] = useState('classes'); // 'classes', 'students', 'attendance', 'calendar', 'messages'
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Message posting
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  
  // Student management
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentEnrolledClasses, setStudentEnrolledClasses] = useState({});
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // Class management
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [instructorName, setInstructorName] = useState('Instructor');
  const [_instructorFirstName, setInstructorFirstName] = useState('Instructor');
  
  // Schedule states
  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleStartTime, setScheduleStartTime] = useState(null);
  const [scheduleDuration, setScheduleDuration] = useState('60');
  const [scheduleDescription, setScheduleDescription] = useState('');
  
  // Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  
  // Attendance validation states
  const [isCurrentDateScheduled, setIsCurrentDateScheduled] = useState(false);
  const [scheduledDates, setScheduledDates] = useState([]);
  
  // Calendar attendance modal states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [modalSelectedDate, setModalSelectedDate] = useState(null);
  
  // Force re-render state for schedule list
  const [scheduleListKey, setScheduleListKey] = useState(0);
  
  // Student counts for each class
  const [classStudentCounts, setClassStudentCounts] = useState({});
  
  // Profile screen state
  const [showProfile, setShowProfile] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);

  useEffect(() => {
    loadInstructorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadInstructorData is stable and doesn't need to be in deps

  // Filter students based on search query
  useEffect(() => {
    if (studentSearchQuery.trim() === '') {
      setFilteredStudents(allStudents);
    } else {
      const filtered = allStudents.filter(student => 
        student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [studentSearchQuery, allStudents]);

  const loadInstructorData = async () => {
    try {
      setIsLoading(true);
      const currentUser = authService.getCurrentUser();
      const classesData = await dataService.getClasses(currentUser?.uid);
      const studentsData = await dataService.getAllStudents();
      setClasses(classesData);
      setAllStudents(studentsData);
      
      // Load student counts for all classes
      const counts = {};
      for (const classItem of classesData) {
        try {
          const classStudents = await dataService.getStudents(classItem.id);
          counts[classItem.id] = classStudents.length;
        } catch (error) {
          console.error(`Error loading students for class ${classItem.name}:`, error);
          counts[classItem.id] = 0;
        }
      }
      setClassStudentCounts(counts);

      // Load pending invitations
      await loadPendingInvitations();
      
      // Load instructor's name
      if (currentUser) {
        try {
          const userProfile = await dataService.getUserProfile(currentUser.uid);
          if (userProfile?.firstName) {
            setInstructorFirstName(userProfile.firstName);
            setInstructorName(userProfile.name || `${userProfile.firstName} ${userProfile.lastName || ''}`.trim());
          } else if (userProfile?.name) {
            const firstName = userProfile.name.split(' ')[0];
            setInstructorFirstName(firstName);
            setInstructorName(userProfile.name);
          } else if (userProfile?.email) {
            const emailName = userProfile.email.split('@')[0];
            setInstructorFirstName(emailName);
            setInstructorName(emailName);
          }
        } catch (error) {
        }
      }
      
      // Don't automatically select a class - let user choose
      // if (classesData.length > 0) {
      //   setCurrentClass(classesData[0]);
      //   await loadClassData(classesData[0].id);
      // }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading instructor data:', error);
      setIsLoading(false);
    }
  };

  const loadStudentEnrolledClasses = async () => {
    try {
      const enrolledClassesMap = {};
      
      for (const student of allStudents) {
        const enrolledClasses = await getStudentEnrolledClasses(student.id);
        enrolledClassesMap[student.id] = enrolledClasses;
      }
      
      setStudentEnrolledClasses(enrolledClassesMap);
    } catch (error) {
      console.error('Error loading student enrolled classes:', error);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Get all pending invitations for this instructor's classes
      const allInvitations = [];
      for (const classItem of classes) {
        const classInvitations = await dataService.getPendingInvitationsForClass(classItem.id);
        allInvitations.push(...classInvitations);
      }
      
      setPendingInvitations(allInvitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const loadClassData = async (classId) => {
    try {
      dataService.setCurrentClass(classId);
      const studentsData = await dataService.getStudents(classId);
      const attendanceData = await dataService.getAttendance(classId);
      const messagesData = await dataService.getMessages(classId);
      const schedulesData = await dataService.getSchedules(classId);
      
      // Add classId to each student for proper filtering
      const studentsWithClassId = studentsData.map(student => ({
        ...student,
        classId: classId
      }));
      
      setStudents(studentsWithClassId);
      setAttendance(attendanceData);
      setMessages(messagesData);
      setSchedules(schedulesData);
      
      // Update student count for this class
      setClassStudentCounts(prev => ({
        ...prev,
        [classId]: studentsData.length
      }));
      
      // Check if current date is scheduled and load scheduled dates
      await checkIfDateIsScheduled(classId);
      await loadScheduledDates(classId);
    } catch (error) {
      console.error('Error loading class data:', error);
    }
  };

  const refreshAllClassStudentCounts = async () => {
    try {
      const counts = {};
      for (const classItem of classes) {
        try {
          const classStudents = await dataService.getStudents(classItem.id);
          counts[classItem.id] = classStudents.length;
        } catch (error) {
          console.error(`Error loading students for class ${classItem.name}:`, error);
          counts[classItem.id] = 0;
        }
      }
      setClassStudentCounts(counts);
    } catch (error) {
      console.error('Error refreshing class student counts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInstructorData();
    if (currentClass) {
      await loadClassData(currentClass.id);
    }
    await loadPendingInvitations();
    setRefreshing(false);
  };

  const selectClass = async (classItem) => {
    try {
      setCurrentClass(classItem);
      await loadClassData(classItem.id);
      
      // Show a brief success message
      
      // Switch to students view to show the selected class data
      setViewMode('students');
    } catch (error) {
      console.error('Error selecting class:', error);
      Alert.alert('Error', 'Failed to load class data');
    }
  };

  // Schedule management functions
  const _loadSchedules = async (classId) => {
    try {
      const classSchedules = await dataService.getSchedules(classId);
      setSchedules(classSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const addSchedule = async () => {
    if (!currentClass) {
      Alert.alert('Error', 'Please select a class first');
      return;
    }

    if (!scheduleDate || !scheduleStartTime || !scheduleDuration) {
      Alert.alert('Error', 'Please select date, start time, and duration');
      return;
    }

    try {
      const endTime = calculateEndTime(scheduleStartTime, scheduleDuration);
      const formattedDate = formatDate(scheduleDate);
      
      
      const scheduleData = {
        classId: currentClass.id,
        date: formattedDate,
        startTime: formatTime(scheduleStartTime),
        endTime: endTime ? formatTime(endTime) : null,
        duration: parseInt(scheduleDuration, 10),
        description: scheduleDescription,
        createdAt: new Date().toISOString()
      };

      await dataService.saveSchedule(scheduleData);
      
      // Add to local state
      const newSchedule = {
        id: Date.now().toString(),
        ...scheduleData
      };
      setSchedules([...schedules, newSchedule]);

      // Reset form and close modal
      closeScheduleModal();

      Alert.alert('Success', 'Schedule added successfully!');
    } catch (error) {
      console.error('Error adding schedule:', error);
      Alert.alert('Error', 'Failed to add schedule');
    }
  };

  const deleteSchedule = async (scheduleId) => {
    try {
      // Find the schedule to get its date
      const scheduleToDelete = schedules.find(schedule => schedule.id === scheduleId);
      if (!scheduleToDelete) {
        Alert.alert('Error', 'Schedule not found');
        return;
      }

      // Check if there's attendance for this date
      const hasAttendance = await dataService.hasAttendanceForDate(currentClass.id, scheduleToDelete.date);
      
      if (hasAttendance) {
        Alert.alert(
          'Cannot Delete Schedule',
          'This schedule cannot be deleted because attendance has already been marked for this date. Please remove all attendance records first.',
          [{ text: 'OK' }]
        );
        return;
      }

      await dataService.deleteSchedule(scheduleId);
      setSchedules(schedules.filter(s => s.id !== scheduleId));
      Alert.alert('Success', 'Schedule deleted successfully!');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      Alert.alert('Error', 'Failed to delete schedule');
    }
  };

  // Helper functions for date/time formatting
  const formatDate = (date) => {
    if (!date) return 'Select Date';
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD format
  };

  const formatTime = (date) => {
    if (!date) return 'Select Time';
    return date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
  };

  const calculateEndTime = (startTime, duration) => {
    if (!startTime || !duration) return null;
    
    const start = new Date(startTime);
    const durationMinutes = parseInt(duration, 10);
    
    if (isNaN(durationMinutes)) return null;
    
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end;
  };

  // Picker change handlers
  const onDateChange = (event, selectedDateValue) => {
    // Hide the picker first
    setShowDatePicker(false);
    
    // Only update if we have a valid selectedDateValue and it's not a dismissal
    if (event.type === 'set' && selectedDateValue) {
      // Create a new date object using device local timezone
      const localDate = new Date(selectedDateValue.getFullYear(), selectedDateValue.getMonth(), selectedDateValue.getDate());
      setScheduleDate(localDate);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    // Hide the picker first
    setShowStartTimePicker(false);
    
    // Only update if we have a valid selectedTime and it's not a dismissal
    if (event.type === 'set' && selectedTime) {
      setScheduleStartTime(selectedTime);
    }
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setScheduleDate(null);
    setScheduleStartTime(null);
    setScheduleDuration('60');
    setScheduleDescription('');
  };


  const loadMessages = async () => {
    if (currentClass) {
      try {
        const messagesData = await dataService.getMessages(currentClass.id);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  };


  const getStudentEnrolledClasses = async (studentId) => {
    try {
      const assignments = await dataService.getStudentClasses(studentId);
      const enrolledClasses = [];
      
      for (const assignment of assignments) {
        const classInfo = classes.find(c => c.id === assignment.classId);
        if (classInfo) {
          enrolledClasses.push(classInfo.name);
        }
      }
      
      return enrolledClasses;
    } catch (error) {
      console.error('Error getting student enrolled classes:', error);
      return [];
    }
  };

  const addClass = async () => {
    if (!newClassName.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }

    try {
      const currentUser = authService.getCurrentUser();
      const newClass = {
        id: Date.now().toString(),
        name: newClassName.trim(),
        description: newClassDescription.trim(),
        instructorId: currentUser?.uid, // Associate with instructor's user ID
        instructorName: instructorName,
        createdAt: new Date().toISOString()
      };

      // Save class to data service
      await dataService.saveClass(newClass);
      
      // Update local state
      const updatedClasses = [...classes, newClass];
      setClasses(updatedClasses);
      
      // Clear form and close modal
      setNewClassName('');
      setNewClassDescription('');
      setShowAddClassModal(false);
      
      // Auto-select the new class
      setCurrentClass(newClass);
      setViewMode('students');
      
      Alert.alert('Success', 'Class created successfully!');
    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', 'Failed to create class');
    }
  };

  const deleteClass = (classId) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This will also remove all students and attendance records.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from data service
              await dataService.deleteClass(classId);
              
              // Update local state
              const updatedClasses = classes.filter(c => c.id !== classId);
              setClasses(updatedClasses);
              
              // If this was the current class, clear it
              if (currentClass && currentClass.id === classId) {
                setCurrentClass(null);
                setStudents([]);
                setAttendance({});
                setViewMode('classes');
              }
              
              Alert.alert('Success', 'Class deleted successfully!');
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'Failed to delete class');
            }
          },
        },
      ]
    );
  };

  const addStudentToClass = async (student) => {
    if (!currentClass) {
      Alert.alert('Error', 'Please select a class first');
      return;
    }

    try {
      // Check if student is already in this specific class
      const isAlreadyInThisClass = students.some(s => s.id === student.id && s.classId === currentClass.id);
      if (isAlreadyInThisClass) {
        Alert.alert('Info', `This student is already enrolled in ${currentClass.name}`);
        return;
      }

      // Check if there's already a pending invitation for this student and class
      const existingInvitations = await dataService.getPendingInvitations(student.id);
      const hasPendingInvitation = existingInvitations.some(inv => inv.classId === currentClass.id);
      
      if (hasPendingInvitation) {
        Alert.alert('Info', `An invitation has already been sent to ${student.name} for ${currentClass.name}`);
        return;
      }

      // Create pending invitation
      const invitation = {
        id: `inv_${Date.now()}_${student.id}_${currentClass.id}`,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        classId: currentClass.id,
        className: currentClass.name,
        instructorId: authService.getCurrentUser()?.uid,
        instructorName: instructorName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: `You have been invited to join ${currentClass.name} by ${instructorName}`
      };

      await dataService.savePendingInvitation(invitation);
      
      // Refresh pending invitations
      await loadPendingInvitations();
      
      Alert.alert('Success', `Invitation sent to ${student.name} for ${currentClass.name}! They will need to accept it before being enrolled.`);
      setShowAddStudentModal(false);
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const removeStudentFromClass = async (studentId, classId = null) => {
    const targetClassId = classId || currentClass?.id;
    if (!targetClassId) {
      Alert.alert('Error', 'Please select a class first');
      return;
    }

    Alert.alert(
      'Remove Student',
      'Are you sure you want to remove this student from the class?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from class assignment
              await dataService.removeStudentFromClass(studentId, targetClassId);

              // Remove from local students list
              const updatedStudents = students.filter(s => !(s.id === studentId && s.classId === targetClassId));
              setStudents(updatedStudents);

              // Remove attendance records for this student from this class
              const updatedAttendance = {};
              Object.keys(attendance).forEach(key => {
                if (!key.startsWith(`${studentId}_`)) {
                  updatedAttendance[key] = attendance[key];
                }
              });
              setAttendance(updatedAttendance);
              await dataService.saveAttendance(updatedAttendance);
              
              // Update student count for this class
              setClassStudentCounts(prev => ({
                ...prev,
                [targetClassId]: Math.max(0, (prev[targetClassId] || 0) - 1)
              }));

              // Refresh all class student counts to ensure accuracy
              await refreshAllClassStudentCounts();

              Alert.alert('Success', 'Student removed from class successfully!');
            } catch (error) {
              console.error('Error removing student:', error);
              Alert.alert('Error', 'Failed to remove student from class');
            }
          },
        },
      ]
    );
  };

  const postMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!currentClass) {
      Alert.alert('Error', 'Please select a class first');
      return;
    }

    try {
      await dataService.saveMessage({
        title: messageTitle.trim(),
        content: messageContent.trim(),
        instructorName: instructorName
      }, currentClass.id);

      // Refresh messages list
      const messagesData = await dataService.getMessages(currentClass.id);
      setMessages(messagesData);

      Alert.alert('Success', 'Message posted successfully!');
      setMessageTitle('');
      setMessageContent('');
      setShowMessageModal(false);
    } catch (error) {
      console.error('Error posting message:', error);
      Alert.alert('Error', 'Failed to post message');
    }
  };

  const checkIfDateIsScheduled = async (classId, date = null) => {
    try {
      const targetDate = date || selectedDate;
      const isScheduled = await dataService.isDateScheduled(classId, targetDate);
      setIsCurrentDateScheduled(isScheduled);
      return isScheduled;
    } catch (error) {
      console.error('Error checking if date is scheduled:', error);
      setIsCurrentDateScheduled(false);
      return false;
    }
  };

  const loadScheduledDates = async (classId) => {
    try {
      const dates = await dataService.getScheduledDates(classId);
      setScheduledDates(dates);
    } catch (error) {
      console.error('Error loading scheduled dates:', error);
      setScheduledDates([]);
    }
  };

  const toggleAttendance = async (studentId) => {
    if (!currentClass) return;
    
    // Check if current date is scheduled before allowing attendance marking
    const isScheduled = await checkIfDateIsScheduled(currentClass.id, selectedDate);
    if (!isScheduled) {
      Alert.alert(
        'Attendance Not Available',
        'Attendance can only be marked on scheduled class dates. Please select a scheduled date or create a schedule for today.',
        [{ text: 'OK' }]
      );
      return;
    }

    const attendanceKey = `${studentId}_${selectedDate}`;
    const attendanceValue = attendance[attendanceKey];
    
    let currentStatus = 'not_marked';
    if (attendanceValue === true) currentStatus = 'present';
    else if (attendanceValue === false) currentStatus = 'absent';
    
    let newStatus;
    if (currentStatus === 'not_marked') {
      newStatus = true; // Mark as present
    } else if (currentStatus === 'present') {
      newStatus = false; // Mark as absent
    } else {
      newStatus = undefined; // Remove from attendance (back to not_marked)
    }
    

    const newAttendance = { ...attendance };
    if (newStatus === undefined) {
      delete newAttendance[attendanceKey];
    } else {
      newAttendance[attendanceKey] = newStatus;
    }
    
    setAttendance(newAttendance);
    dataService.saveAttendance(newAttendance);
    
    
    // Force re-render of schedule list to update attendance status
    setScheduleListKey(prev => prev + 1);
  };

  const getAttendanceStatus = async (studentId, date = null) => {
    const targetDate = date || selectedDate;
    return await dataService.getAttendanceStatus(studentId, targetDate, currentClass?.id);
  };

  const _isPresent = async (studentId, date = null) => {
    const status = await getAttendanceStatus(studentId, date);
    return status === 'present';
  };

  const _isAbsent = async (studentId, date = null) => {
    const status = await getAttendanceStatus(studentId, date);
    return status === 'absent';
  };

  const _isNotMarked = async (studentId, date = null) => {
    const status = await getAttendanceStatus(studentId, date);
    return status === 'not_marked';
  };

  const getAttendanceStats = (date = null) => {
    const targetDate = date || selectedDate;
    
    // Handle case where targetDate is undefined or null
    if (!targetDate) {
      return { present: 0, absent: 0, total: students.length };
    }
    
    // Convert date to string format used in attendance keys
    let targetDateString;
    if (typeof targetDate === 'string') {
      targetDateString = targetDate;
    } else if (targetDate instanceof Date) {
      targetDateString = targetDate.toISOString().split('T')[0];
    } else {
      return { present: 0, absent: 0, total: students.length };
    }
    
    let presentCount = 0;
    let absentCount = 0;
    
    students.forEach(student => {
      const attendanceKey = `${student.id}_${targetDateString}`;
      const attendanceValue = attendance[attendanceKey];
      
      if (attendanceValue === true) {
        presentCount++;
      } else if (attendanceValue === false) {
        absentCount++;
      }
    });
    
    return { 
      present: presentCount, 
      absent: absentCount, 
      total: students.length 
    };
  };

  const getMarkedDates = useMemo(() => {
    const marked = {};
    
    // Get today's date in device local timezone (YYYY-MM-DD format)
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDay = String(now.getDate()).padStart(2, '0');
    const todayString = `${todayYear}-${todayMonth}-${todayDay}`;
    
    
    // Mark today
    marked[todayString] = {
      selected: selectedDate === todayString,
      selectedColor: '#007AFF',
      marked: true,
      dotColor: '#007AFF',
    };
    
    // Mark selected date if different from today
    if (selectedDate !== todayString) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#FF6B6B',
      };
    }
    
    // Mark scheduled dates with appropriate colors based on attendance status
    scheduledDates.forEach(date => {
      if (date !== todayString && date !== selectedDate) {
        // Count attendance for this specific date
        let present = 0, absent = 0, notMarked = 0, total = 0;
        
        students.forEach(student => {
          total++;
          const attendanceKey = `${student.id}_${date}`;
          const attendanceValue = attendance[attendanceKey];
          if (attendanceValue === true) {
            present++;
          } else if (attendanceValue === false) {
            absent++;
          } else {
            notMarked++;
          }
        });
        
        // Color code based on attendance status
        let dotColor = '#28a745'; // Default green for scheduled class
        if (total > 0) {
          if (notMarked === total) {
            dotColor = '#6c757d'; // All not marked - gray (scheduled but no attendance)
          } else if (present === total) {
            dotColor = '#28a745'; // All present - green
          } else if (absent === total) {
            dotColor = '#dc3545'; // All absent - red
          } else if (present > absent) {
            dotColor = '#ffc107'; // More present than absent - yellow
          } else if (absent > present) {
            dotColor = '#fd7e14'; // More absent than present - orange
          } else {
            dotColor = '#6c757d'; // Mixed or equal - gray
          }
        }
        
        marked[date] = {
          marked: true,
          dotColor: dotColor,
          activeOpacity: 0.7
        };
      }
    });
    
    return marked;
  }, [selectedDate, scheduledDates, attendance, students]);

  const onDayPress = async (day) => {
    const newDate = day.dateString;
    
    setSelectedDate(newDate);
    setModalSelectedDate(newDate);
    
    if (currentClass) {
      const isScheduled = await checkIfDateIsScheduled(currentClass.id, newDate);
      
      if (isScheduled) {
        setShowAttendanceModal(true);
      } else {
        Alert.alert(
          'No Class Scheduled',
          'There is no class scheduled for this date. Please select a scheduled date to mark attendance.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString();
  };

  const _renderClassItem = ({ item }) => {
    // Get student count for this class from the state
    const studentCount = classStudentCounts[item.id] || 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.classCard,
          currentClass?.id === item.id && styles.selectedClassCard
        ]}
        onPress={() => selectClass(item)}
        activeOpacity={0.7}
      >
        <View style={styles.classInfo}>
          <Text style={[
            styles.className,
            currentClass?.id === item.id && styles.selectedClassName
          ]}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.classDescription}>{item.description}</Text>
          )}
          <Text style={styles.classStudentCount}>
            {studentCount} student{studentCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.classClickHint}>
            Tap to select this class
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteClassButton}
          onPress={() => deleteClass(item.id)}
        >
          <Text style={styles.deleteClassButtonText}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        {item.className && (
          <Text style={styles.studentClass}>Class: {item.className}</Text>
        )}
        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={() => {
            setSelectedStudent(item);
            setShowStudentProfile(true);
          }}
        >
          <Text style={styles.viewProfileButtonText}>👤 View Profile</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.unenrollButton}
        onPress={() => removeStudentFromClass(item.id, item.classId)}
      >
        <Text style={styles.unenrollButtonText}>Unenroll</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAttendanceItem = ({ item }) => {
    // Get status from attendance state directly
    const attendanceKey = `${item.id}_${selectedDate}`;
    const attendanceValue = attendance[attendanceKey];
    let status = 'not_marked';
    if (attendanceValue === true) status = 'present';
    else if (attendanceValue === false) status = 'absent';
    

    const getButtonStyle = () => {
      if (!isCurrentDateScheduled) return styles.disabledButton;
      if (status === 'present') return [styles.attendanceButton, styles.presentButton];
      if (status === 'absent') return [styles.attendanceButton, styles.absentButton];
      return [styles.attendanceButton, styles.notMarkedButton];
    };

    const getButtonTextStyle = () => {
      if (!isCurrentDateScheduled) return styles.disabledButtonText;
      if (status === 'present') return [styles.attendanceButtonText, styles.presentButtonText];
      if (status === 'absent') return [styles.attendanceButtonText, styles.absentButtonText];
      return [styles.attendanceButtonText, styles.notMarkedButtonText];
    };

    const getButtonText = () => {
      if (status === 'present') return '✓ Present';
      if (status === 'absent') return '✗ Absent';
      return '○ Not Marked';
    };

    return (
      <View style={styles.studentItem}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
          {!isCurrentDateScheduled && (
            <Text style={styles.scheduleWarningText}>
              ⚠️ Attendance not available - no class scheduled for this date
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={getButtonStyle()}
          onPress={() => toggleAttendance(item.id)}
          disabled={!isCurrentDateScheduled}
        >
          <Text style={getButtonTextStyle()}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessageItem = ({ item }) => (
    <View style={styles.messageCard}>
      <Text style={styles.messageTitle}>{item.title}</Text>
      <Text style={styles.messageContent}>{item.content}</Text>
      <Text style={styles.messageDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderScheduleItem = ({ item }) => {
    // Check if this schedule has attendance marked
    const hasAttendance = Object.keys(attendance).some(key => {
      const [, date] = key.split('_');
      return date === item.date;
    });

    return (
      <View style={[
        styles.scheduleCard,
        hasAttendance && styles.scheduleCardWithAttendance
      ]}>
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
          {hasAttendance && (
            <Text style={styles.attendanceMarkedText}>✓ Attendance Marked</Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.deleteScheduleButton,
            hasAttendance && styles.deleteScheduleButtonDisabled
          ]}
          onPress={() => deleteSchedule(item.id)}
          disabled={hasAttendance}
        >
          <Text style={[
            styles.deleteScheduleButtonText,
            hasAttendance && styles.deleteScheduleButtonTextDisabled
          ]}>
            {hasAttendance ? '🔒' : '🗑️'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

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

  // Show profile screen if requested
  if (showProfile) {
    return (
      <InstructorProfile onBack={() => setShowProfile(false)} />
    );
  }

  // Show student profile modal
  const renderStudentProfileModal = () => (
    <Modal
      visible={showStudentProfile}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.studentProfileModal}>
          <View style={styles.studentProfileHeader}>
            <Text style={styles.studentProfileTitle}>Student Profile</Text>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowStudentProfile(false);
                setSelectedStudent(null);
              }}
            >
              <Text style={styles.closeModalButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedStudent && (
            <View style={styles.studentProfileContent}>
              <View style={styles.studentProfileAvatar}>
                <Text style={styles.studentProfileAvatarText}>
                  {selectedStudent.avatar || '👤'}
                </Text>
              </View>
              
              <View style={styles.studentProfileInfo}>
                <View style={styles.studentProfileField}>
                  <Text style={styles.studentProfileLabel}>Name</Text>
                  <Text style={styles.studentProfileValue}>{selectedStudent.name}</Text>
                </View>
                
                <View style={styles.studentProfileField}>
                  <Text style={styles.studentProfileLabel}>Email</Text>
                  <Text style={styles.studentProfileValue}>{selectedStudent.email}</Text>
                </View>
                
                {selectedStudent.phone && (
                  <View style={styles.studentProfileField}>
                    <Text style={styles.studentProfileLabel}>Phone</Text>
                    <Text style={styles.studentProfileValue}>{selectedStudent.phone}</Text>
                  </View>
                )}
                
                <View style={styles.studentProfileField}>
                  <Text style={styles.studentProfileLabel}>Class</Text>
                  <Text style={styles.studentProfileValue}>{selectedStudent.className || 'Not assigned'}</Text>
                </View>
                
                <View style={styles.studentProfileField}>
                  <Text style={styles.studentProfileLabel}>Student ID</Text>
                  <Text style={styles.studentProfileValue}>{selectedStudent.id}</Text>
                </View>
                
                <View style={styles.studentProfileField}>
                  <Text style={styles.studentProfileLabel}>Role</Text>
                  <Text style={styles.studentProfileValue}>Student</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoContainer}>
            <Text style={styles.headerLogoIcon}>🎓</Text>
            <Text style={styles.title}>Instructor Dashboard</Text>
          </View>
          <Text style={styles.subtitle}>Manage classes, students, and attendance</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfile(true)}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Class Selection Indicator */}
      {currentClass ? (
        <View style={styles.selectedClassHeader}>
          <View style={styles.classHeaderRow}>
            <View style={styles.selectedClassInfo}>
              <Text style={styles.selectedClassTitle}>Selected Class:</Text>
              <Text style={styles.selectedClassDetailName}>{currentClass.name}</Text>
              {currentClass.description && (
                <Text style={styles.selectedClassDescription}>{currentClass.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.changeClassButton}
              onPress={() => setShowClassSelector(true)}
            >
              <Text style={styles.changeClassButtonText}>Change Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noClassSelectedHeader}>
          <Text style={styles.noClassSelectedTitle}>No Class Selected</Text>
          <Text style={styles.noClassSelectedSubtitle}>Select a class to manage students, attendance, and messages</Text>
          <TouchableOpacity
            style={styles.selectClassButton}
            onPress={() => setShowClassSelector(true)}
          >
            <Text style={styles.selectClassButtonText}>Select Class</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.navigation}>
        {/* Only show these tabs if a class is selected */}
        {currentClass && (
          <>
            <TouchableOpacity
              style={[styles.navButton, viewMode === 'students' && styles.activeNavButton]}
              onPress={() => {
                setViewMode('students');
                // Students will be loaded via loadClassData when class is selected
              }}
            >
              <Text style={[styles.navButtonText, viewMode === 'students' && styles.activeNavButtonText]}>
                Students
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, viewMode === 'attendance' && styles.activeNavButton]}
              onPress={() => setViewMode('attendance')}
            >
              <Text style={[styles.navButtonText, viewMode === 'attendance' && styles.activeNavButtonText]}>
                Attendance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, viewMode === 'calendar' && styles.activeNavButton]}
              onPress={() => setViewMode('calendar')}
            >
              <Text style={[styles.navButtonText, viewMode === 'calendar' && styles.activeNavButtonText]}>
                Calendar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, viewMode === 'messages' && styles.activeNavButton]}
              onPress={() => {
                setViewMode('messages');
                loadMessages();
              }}
            >
              <Text style={[styles.navButtonText, viewMode === 'messages' && styles.activeNavButtonText]}>
                Messages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, viewMode === 'schedule' && styles.activeNavButton]}
              onPress={() => setViewMode('schedule')}
            >
              <Text style={[styles.navButtonText, viewMode === 'schedule' && styles.activeNavButtonText]}>
                Schedule
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>


      {viewMode === 'students' && currentClass && (
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Students in <Text style={styles.boldClassName}>{currentClass.name}</Text>
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={async () => {
                setShowAddStudentModal(true);
                await loadStudentEnrolledClasses();
              }}
            >
              <Text style={styles.addButtonText}>+ Add Student</Text>
            </TouchableOpacity>
          </View>

          {/* Pending Invitations Section */}
          {pendingInvitations.filter(inv => inv.classId === currentClass.id).length > 0 && (
            <View style={styles.pendingInvitationsSection}>
              <Text style={styles.sectionTitle}>📨 Pending Invitations</Text>
              <Text style={styles.sectionSubtitle}>
                Students who haven't responded to class invitations yet
              </Text>
              {pendingInvitations
                .filter(inv => inv.classId === currentClass.id)
                .map((invitation) => (
                  <View key={invitation.id} style={styles.invitationCard}>
                    <View style={styles.invitationInfo}>
                      <Text style={styles.invitationStudentName}>{invitation.studentName}</Text>
                      <Text style={styles.invitationStudentEmail}>{invitation.studentEmail}</Text>
                      <Text style={styles.invitationDate}>
                        Sent: {new Date(invitation.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.invitationStatus}>
                      <Text style={styles.pendingStatus}>⏳ Pending</Text>
                    </View>
                  </View>
                ))}
            </View>
          )}
          <FlatList
            data={students.filter(student => student.classId === currentClass.id)}
            renderItem={renderStudentItem}
            keyExtractor={(item) => `${item.id}_${item.classId}`}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No students in this class</Text>
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => setShowAddStudentModal(true)}
                >
                  <Text style={styles.emptyAddButtonText}>Add Your First Student</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {viewMode === 'students' && !currentClass && (
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a class first</Text>
            <Text style={styles.emptySubtext}>Go to the Classes tab and click on a class to view its students</Text>
          </View>
        </View>
      )}

      {viewMode === 'attendance' && currentClass && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Attendance for {selectedDate}</Text>
          
          {/* Schedule status indicator */}
          <View style={[
            styles.scheduleStatusContainer,
            isCurrentDateScheduled ? styles.scheduledStatus : styles.notScheduledStatus
          ]}>
            <Text style={[
              styles.scheduleStatusText,
              isCurrentDateScheduled ? styles.scheduledStatusText : styles.notScheduledStatusText
            ]}>
              {isCurrentDateScheduled ? '✓ Class scheduled - Attendance available' : '⚠️ No class scheduled - Attendance not available'}
            </Text>
          </View>
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Present: {getAttendanceStats().present} / {getAttendanceStats().total} | Absent: {getAttendanceStats().absent}
            </Text>
          </View>
          
          {scheduledDates.length > 0 && (
            <View style={styles.scheduledDatesContainer}>
              <Text style={styles.scheduledDatesTitle}>Scheduled Dates:</Text>
              <Text style={styles.scheduledDatesText}>
                {scheduledDates.map(date => new Date(date).toLocaleDateString()).join(', ')}
              </Text>
            </View>
          )}
          
          <FlatList
            data={students}
            renderItem={renderAttendanceItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      )}

      {viewMode === 'attendance' && !currentClass && (
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a class first</Text>
            <Text style={styles.emptySubtext}>Go to the Classes tab and click on a class to view attendance</Text>
          </View>
        </View>
      )}

      {viewMode === 'calendar' && !currentClass && (
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a class first</Text>
            <Text style={styles.emptySubtext}>Go to the Classes tab and click on a class to view calendar</Text>
          </View>
        </View>
      )}

      {viewMode === 'calendar' && currentClass && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Attendance Calendar</Text>
          
          {/* Selected Date and Schedule Status */}
          <View style={styles.calendarHeaderContainer}>
            <Text style={styles.selectedDateText}>
              Selected: {formatDateForDisplay(selectedDate)}
            </Text>
            
            {/* Schedule status indicator - only show when scheduled */}
            {isCurrentDateScheduled && (
              <View style={[
                styles.scheduleStatusContainer,
                styles.scheduledStatus
              ]}>
                <Text style={[
                  styles.scheduleStatusText,
                  styles.scheduledStatusText
                ]}>
                  ✓ Class scheduled - Click date to mark attendance
                </Text>
              </View>
            )}
            
          </View>

          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={onDayPress}
              markedDates={getMarkedDates}
              style={styles.calendarStyle}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#00adf5',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#00adf5',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#00adf5',
                selectedDotColor: '#ffffff',
                arrowColor: '#00adf5',
                monthTextColor: '#2d4150',
                indicatorColor: '#00adf5',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13
              }}
            />
            
            {/* Calendar Legend */}
            <View style={styles.calendarLegend}>
              <Text style={styles.legendTitle}>Calendar Legend:</Text>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
                  <Text style={styles.legendText}>Today</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6c757d' }]} />
                  <Text style={styles.legendText}>Scheduled (No Attendance)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
                  <Text style={styles.legendText}>All Present</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ffc107' }]} />
                  <Text style={styles.legendText}>Mixed Attendance</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#dc3545' }]} />
                  <Text style={styles.legendText}>All Absent</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#fd7e14' }]} />
                  <Text style={styles.legendText}>Mostly Absent</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.calendarInstructions}>
            <Text style={styles.instructionsTitle}>How to Mark Attendance:</Text>
            <Text style={styles.instructionsText}>
              1. Select a scheduled date on the calendar{'\n'}
              2. A modal will open automatically for that date{'\n'}
              3. Click buttons to cycle through: Not Marked → Present → Absent → Not Marked{'\n'}
              4. Use the Attendance tab for today's scheduled classes{'\n'}
              5. View attendance history with color-coded calendar dots
            </Text>
          </View>
        </ScrollView>
      )}

      {viewMode === 'messages' && !currentClass && (
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a class first</Text>
            <Text style={styles.emptySubtext}>Go to the Classes tab and click on a class to view messages</Text>
          </View>
        </View>
      )}

      {viewMode === 'messages' && currentClass && (
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Messages for {currentClass.name}</Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowMessageModal(true)}
            >
              <Text style={styles.addButtonText}>+ Post Message</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages posted yet</Text>
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => setShowMessageModal(true)}
                >
                  <Text style={styles.emptyAddButtonText}>Post Your First Message</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {viewMode === 'schedule' && !currentClass && (
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a class first</Text>
            <Text style={styles.emptySubtext}>Go to the Classes tab and click on a class to manage its schedule</Text>
          </View>
        </View>
      )}

      {viewMode === 'schedule' && currentClass && (
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Schedule for <Text style={styles.boldClassName}>{currentClass.name}</Text>
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Schedule</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            key={scheduleListKey}
            data={schedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No schedule set for this class</Text>
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => setShowScheduleModal(true)}
                >
                  <Text style={styles.emptyAddButtonText}>Add Your First Schedule</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* Add Student Modal */}
      <Modal
        visible={showAddStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddStudentModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddStudentModal(false)}
        >
          <TouchableOpacity 
            style={styles.addStudentModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.addStudentModalHeader}>
              <View style={styles.addStudentHeaderIcon}>
                <Text style={styles.addStudentHeaderIconText}>👥</Text>
              </View>
              <View style={styles.addStudentHeaderText}>
                <Text style={styles.addStudentModalTitle}>Add Student to Class</Text>
                <Text style={styles.addStudentModalSubtitle}>
                  Add a student to {currentClass?.name}
                </Text>
              </View>
            </View>
            
            <ScrollView 
              style={styles.addStudentScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.addStudentFormContainer}>
                {/* Search Input */}
                <View style={styles.addStudentSearchSection}>
                  <Text style={styles.addStudentSearchLabel}>Search Students</Text>
                  <View style={styles.addStudentSearchContainer}>
                    <TextInput
                      style={styles.addStudentSearchInput}
                      placeholder="Search by name or email..."
                      value={studentSearchQuery}
                      onChangeText={setStudentSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.addStudentSearchIcon}>🔍</Text>
                  </View>
                  {studentSearchQuery.trim() !== '' && (
                    <Text style={styles.addStudentSearchResults}>
                      {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                    </Text>
                  )}
                </View>

                {/* Students List */}
                <View style={styles.addStudentListSection}>
                  <Text style={styles.addStudentListTitle}>Available Students</Text>
                  <FlatList
                    data={filteredStudents}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.addStudentItem,
                          studentEnrolledClasses[item.id]?.includes(currentClass?.name) && styles.addStudentItemDisabled
                        ]}
                        onPress={() => addStudentToClass(item)}
                        disabled={studentEnrolledClasses[item.id]?.includes(currentClass?.name)}
                      >
                        <View style={styles.addStudentItemInfo}>
                          <Text style={styles.addStudentItemName}>{item.name}</Text>
                          <Text style={styles.addStudentItemEmail}>{item.email}</Text>
                          {studentEnrolledClasses[item.id] && studentEnrolledClasses[item.id].length > 0 && (
                            <Text style={styles.addStudentEnrolledClasses}>
                              Enrolled in: {studentEnrolledClasses[item.id].join(', ')}
                            </Text>
                          )}
                          {studentEnrolledClasses[item.id]?.includes(currentClass?.name) && (
                            <Text style={styles.addStudentAlreadyEnrolled}>
                              ✓ Already enrolled in this class
                            </Text>
                          )}
                        </View>
                        <View style={styles.addStudentItemAction}>
                          {studentEnrolledClasses[item.id]?.includes(currentClass?.name) ? (
                            <Text style={styles.addStudentCheckIcon}>✓</Text>
                          ) : (
                            <Text style={styles.addStudentAddIcon}>+</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      studentSearchQuery.trim() !== '' ? (
                        <View style={styles.addStudentNoResults}>
                          <Text style={styles.addStudentNoResultsIcon}>🔍</Text>
                          <Text style={styles.addStudentNoResultsText}>No students found</Text>
                          <Text style={styles.addStudentNoResultsSubtext}>
                            No students match "{studentSearchQuery}"
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.addStudentEmpty}>
                          <Text style={styles.addStudentEmptyIcon}>👥</Text>
                          <Text style={styles.addStudentEmptyText}>No registered students</Text>
                          <Text style={styles.addStudentEmptySubtext}>
                            Students need to register first before they can be added to classes
                          </Text>
                        </View>
                      )
                    }
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.addStudentModalButtons}>
              <TouchableOpacity
                style={styles.addStudentCancelButton}
                onPress={() => {
                  setShowAddStudentModal(false);
                  setStudentSearchQuery('');
                }}
              >
                <Text style={styles.addStudentCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Class Selector Modal */}
      <Modal
        visible={showClassSelector}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.classSelectorModal}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <Text style={styles.modalSubtitle}>Choose a class to manage</Text>
            
            <View style={styles.classesListContainer}>
              <FlatList
                data={classes}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.classSelectItem,
                      currentClass?.id === item.id && styles.selectedClassSelectItem
                    ]}
                    onPress={() => {
                      selectClass(item);
                      setShowClassSelector(false);
                    }}
                  >
                    <View style={styles.classSelectInfo}>
                      <Text style={[
                        styles.classSelectName,
                        currentClass?.id === item.id && styles.selectedClassSelectName
                      ]}>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text style={styles.classSelectDescription}>{item.description}</Text>
                      )}
                      <Text style={[styles.classStudentCount, { backgroundColor: '#f0f0f0', padding: 4, borderRadius: 4, marginTop: 4 }]}>
                        👥 {classStudentCounts[item.id] || 0} student{(classStudentCounts[item.id] || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {currentClass?.id === item.id && (
                      <Text style={styles.selectedClassCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyClassContainer}>
                    <Text style={styles.emptyClassText}>No classes created yet</Text>
                    <Text style={styles.emptyClassSubtext}>Create your first class to get started</Text>
                  </View>
                }
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowClassSelector(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addClassButton}
                onPress={() => {
                  setShowClassSelector(false);
                  setShowAddClassModal(true);
                }}
              >
                <Text style={styles.addClassButtonText}>+ Add New Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.messageModalContent}>
            <View style={styles.messageModalHeader}>
              <Text style={styles.messageModalTitle}>Post Message to Class</Text>
              <Text style={styles.messageModalSubtitle}>
                Share important information with your students
              </Text>
            </View>
            
            <View style={styles.messageFormContainer}>
              <View style={styles.messageInputSection}>
                <Text style={styles.messageInputLabel}>Message Title *</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="e.g., Important Announcement, Class Update"
                  value={messageTitle}
                  onChangeText={setMessageTitle}
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.messageInputSection}>
                <Text style={styles.messageInputLabel}>Message Content *</Text>
                <TextInput
                  style={[styles.messageInput, styles.messageTextArea]}
                  placeholder="Write your message here..."
                  value={messageContent}
                  onChangeText={setMessageContent}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>
            
            <View style={styles.messageModalButtons}>
              <TouchableOpacity
                style={styles.messageCancelButton}
                onPress={() => {
                  setShowMessageModal(false);
                  setMessageTitle('');
                  setMessageContent('');
                }}
              >
                <Text style={styles.messageCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.messagePostButton, (!messageTitle.trim() || !messageContent.trim()) && styles.messagePostButtonDisabled]}
                onPress={postMessage}
                disabled={!messageTitle.trim() || !messageContent.trim()}
              >
                <Text style={styles.messagePostButtonText}>Post Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDatePicker(false);
            setShowStartTimePicker(false);
          }}
        >
          <TouchableOpacity 
            style={styles.scheduleModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.scheduleModalHeader}>
              <View style={styles.scheduleHeaderIcon}>
                <Text style={styles.scheduleHeaderIconText}>📅</Text>
              </View>
              <View style={styles.scheduleHeaderText}>
                <Text style={styles.scheduleModalTitle}>Schedule Class</Text>
                <Text style={styles.scheduleModalSubtitle}>
                  Set up a new class session for {currentClass?.name}
                </Text>
              </View>
            </View>
            
            <ScrollView 
              style={styles.scheduleScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scheduleScrollContent}
            >
              <View style={styles.scheduleFormContainer}>
                {/* Date and Time Row */}
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleInputHalf}>
                    <Text style={styles.scheduleInputLabel}>📅 Date *</Text>
                    <TouchableOpacity
                      style={[styles.schedulePickerButton, scheduleDate && styles.schedulePickerButtonSelected]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={scheduleDate ? styles.schedulePickerButtonText : styles.schedulePickerButtonTextPlaceholder}>
                        {scheduleDate ? formatDate(scheduleDate) : 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={scheduleDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        onDismiss={() => setShowDatePicker(false)}
                      />
                    )}
                  </View>

                  <View style={styles.scheduleInputHalf}>
                    <Text style={styles.scheduleInputLabel}>🕐 Start Time *</Text>
                    <TouchableOpacity
                      style={[styles.schedulePickerButton, scheduleStartTime && styles.schedulePickerButtonSelected]}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={scheduleStartTime ? styles.schedulePickerButtonText : styles.schedulePickerButtonTextPlaceholder}>
                        {scheduleStartTime ? formatTime(scheduleStartTime) : 'Select Time'}
                      </Text>
                    </TouchableOpacity>
                    {showStartTimePicker && (
                      <DateTimePicker
                        value={scheduleStartTime || new Date()}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onStartTimeChange}
                        onDismiss={() => setShowStartTimePicker(false)}
                      />
                    )}
                  </View>
                </View>

                {/* Duration Input */}
                <View style={styles.scheduleInputSection}>
                  <Text style={styles.scheduleInputLabel}>⏱️ Duration *</Text>
                  <View style={styles.scheduleDurationContainer}>
                    <TextInput
                      style={styles.scheduleDurationInput}
                      placeholder="60"
                      value={scheduleDuration}
                      onChangeText={setScheduleDuration}
                      keyboardType="numeric"
                    />
                    <Text style={styles.scheduleDurationUnit}>minutes</Text>
                  </View>
                  {scheduleStartTime && scheduleDuration && (
                    <View style={styles.scheduleDurationPreview}>
                      <Text style={styles.scheduleDurationPreviewIcon}>⏰</Text>
                      <Text style={styles.scheduleDurationPreviewText}>
                        Class will end at {formatTime(calculateEndTime(scheduleStartTime, scheduleDuration))}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Description Input */}
                <View style={styles.scheduleInputSection}>
                  <Text style={styles.scheduleInputLabel}>📝 Description (optional)</Text>
                  <TextInput
                    style={[styles.scheduleInput, styles.scheduleTextArea]}
                    placeholder="Add any special instructions or details for this class..."
                    value={scheduleDescription}
                    onChangeText={setScheduleDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Class Info Card */}
                <View style={styles.scheduleClassInfo}>
                  <Text style={styles.scheduleClassInfoTitle}>Class Details</Text>
                  <View style={styles.scheduleClassInfoRow}>
                    <Text style={styles.scheduleClassInfoLabel}>Class:</Text>
                    <Text style={styles.scheduleClassInfoValue}>{currentClass?.name}</Text>
                  </View>
                  <View style={styles.scheduleClassInfoRow}>
                    <Text style={styles.scheduleClassInfoLabel}>Instructor:</Text>
                    <Text style={styles.scheduleClassInfoValue}>{instructorName}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.scheduleModalButtons}>
              <TouchableOpacity
                style={styles.scheduleCancelButton}
                onPress={closeScheduleModal}
              >
                <Text style={styles.scheduleCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scheduleAddButton, (!scheduleDate || !scheduleStartTime || !scheduleDuration) && styles.scheduleAddButtonDisabled]}
                onPress={addSchedule}
                disabled={!scheduleDate || !scheduleStartTime || !scheduleDuration}
              >
                <Text style={styles.scheduleAddButtonIcon}>➕</Text>
                <Text style={styles.scheduleAddButtonText}>Add Schedule</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Class Modal */}
      <Modal
        visible={showAddClassModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.newClassModalContent}>
            <View style={styles.newClassModalHeader}>
              <Text style={styles.newClassModalTitle}>Create New Class</Text>
              <Text style={styles.newClassModalSubtitle}>
                Set up a new class for your students
              </Text>
            </View>
            
            <ScrollView 
              style={styles.newClassModalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.newClassFormContainer}>
                {/* Class Name Section */}
                <View style={styles.newClassInputSection}>
                  <Text style={styles.newClassInputLabel}>Class Name *</Text>
                  <Text style={styles.newClassInputHelper}>
                    Choose a descriptive name for your class
                  </Text>
                  <TextInput
                    style={styles.newClassInput}
                    placeholder="e.g., Kids Dance Class, Advanced Yoga, Math Tutoring"
                    value={newClassName}
                    onChangeText={setNewClassName}
                    autoCapitalize="words"
                  />
                </View>

                {/* Description Section */}
                <View style={styles.newClassInputSection}>
                  <Text style={styles.newClassInputLabel}>Description</Text>
                  <Text style={styles.newClassInputHelper}>
                    Provide details about what students will learn (optional)
                  </Text>
                  <TextInput
                    style={[styles.newClassInput, styles.newClassTextArea]}
                    placeholder="Describe the class content, objectives, and what students can expect to learn..."
                    value={newClassDescription}
                    onChangeText={setNewClassDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

              </View>
            </ScrollView>
            
            <View style={styles.newClassModalButtons}>
              <TouchableOpacity
                style={styles.newClassCancelButton}
                onPress={() => {
                  setShowAddClassModal(false);
                  setNewClassName('');
                  setNewClassDescription('');
                }}
              >
                <Text style={styles.newClassCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.newClassCreateButton, !newClassName.trim() && styles.newClassCreateButtonDisabled]}
                onPress={addClass}
                disabled={!newClassName.trim()}
              >
                <Text style={styles.newClassCreateButtonText}>Create Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Attendance Modal */}
      <Modal
        visible={showAttendanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttendanceModal(false)}
        >
          <TouchableOpacity 
            style={styles.attendanceModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.attendanceModalHeader}>
              <View style={styles.attendanceHeaderIcon}>
                <Text style={styles.attendanceHeaderIconText}>📋</Text>
              </View>
              <View style={styles.attendanceHeaderText}>
                <Text style={styles.attendanceModalTitle}>Mark Attendance</Text>
                <Text style={styles.attendanceModalSubtitle}>
                  {modalSelectedDate ? formatDateForDisplay(modalSelectedDate) : ''}
                </Text>
              </View>
            </View>
            
            <View style={styles.attendanceStatsContainer}>
              <View style={styles.attendanceStatsCard}>
                <View style={styles.attendanceStatItem}>
                  <Text style={styles.attendanceStatNumber}>{getAttendanceStats(modalSelectedDate).present}</Text>
                  <Text style={styles.attendanceStatLabel}>Present</Text>
                </View>
                <View style={styles.attendanceStatDivider} />
                <View style={styles.attendanceStatItem}>
                  <Text style={styles.attendanceStatNumber}>{getAttendanceStats(modalSelectedDate).absent}</Text>
                  <Text style={styles.attendanceStatLabel}>Absent</Text>
                </View>
                <View style={styles.attendanceStatDivider} />
                <View style={styles.attendanceStatItem}>
                  <Text style={styles.attendanceStatNumber}>{getAttendanceStats(modalSelectedDate).total}</Text>
                  <Text style={styles.attendanceStatLabel}>Total</Text>
                </View>
              </View>
            </View>
            
            <ScrollView 
              style={styles.attendanceScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.attendanceStudentsContainer}>
                <Text style={styles.attendanceStudentsTitle}>Students</Text>
                <FlatList
                  data={students}
                  renderItem={({ item }) => {
                    // Get status from attendance state directly
                    const attendanceKey = `${item.id}_${modalSelectedDate}`;
                    const attendanceValue = attendance[attendanceKey];
                    let status = 'not_marked';
                    if (attendanceValue === true) status = 'present';
                    else if (attendanceValue === false) status = 'absent';
                    
                    return (
                      <View style={styles.attendanceStudentCard}>
                        <View style={styles.attendanceStudentInfo}>
                          <Text style={styles.attendanceStudentName}>{item.name}</Text>
                          <Text style={styles.attendanceStudentEmail}>{item.email}</Text>
                        </View>
                        <View style={styles.attendanceStatusButtons}>
                          <TouchableOpacity
                            style={[
                              styles.attendanceStatusButton,
                              status === 'present' && styles.attendanceStatusButtonActive,
                              status === 'present' && styles.attendancePresentButton
                            ]}
                            onPress={() => {
                              const key = `${item.id}_${modalSelectedDate}`;
                              const newAttendance = { ...attendance };
                              newAttendance[key] = true;
                              setAttendance(newAttendance);
                              dataService.saveAttendance(newAttendance);
                              setScheduleListKey(prev => prev + 1);
                            }}
                          >
                            <Text style={[
                              styles.attendanceStatusButtonText,
                              status === 'present' && styles.attendanceStatusButtonTextActive
                            ]}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.attendanceStatusButton,
                              status === 'absent' && styles.attendanceStatusButtonActive,
                              status === 'absent' && styles.attendanceAbsentButton
                            ]}
                            onPress={() => {
                              const key = `${item.id}_${modalSelectedDate}`;
                              const newAttendance = { ...attendance };
                              newAttendance[key] = false;
                              setAttendance(newAttendance);
                              dataService.saveAttendance(newAttendance);
                              setScheduleListKey(prev => prev + 1);
                            }}
                          >
                            <Text style={[
                              styles.attendanceStatusButtonText,
                              status === 'absent' && styles.attendanceStatusButtonTextActive
                            ]}>✗</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.attendanceStatusButton,
                              status === 'not_marked' && styles.attendanceStatusButtonActive,
                              styles.attendanceNotMarkedButton
                            ]}
                            onPress={() => {
                              const key = `${item.id}_${modalSelectedDate}`;
                              const newAttendance = { ...attendance };
                              delete newAttendance[key];
                              setAttendance(newAttendance);
                              dataService.saveAttendance(newAttendance);
                              setScheduleListKey(prev => prev + 1);
                            }}
                          >
                            <Text style={[
                              styles.attendanceStatusButtonText,
                              status === 'not_marked' && styles.attendanceStatusButtonTextActive
                            ]}>○</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>

            <View style={styles.attendanceModalButtons}>
              <TouchableOpacity
                style={styles.attendanceDoneButton}
                onPress={() => setShowAttendanceModal(false)}
              >
                <Text style={styles.attendanceDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {renderStudentProfileModal()}
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
    fontSize: 18,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 5,
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
    borderColor: '#DEE2E6',
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 16,
    color: '#495057',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#DC3545',
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  navButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeNavButton: {
    borderBottomColor: '#007AFF',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeNavButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  boldClassName: {
    fontWeight: '800',
    color: '#1b5e20',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  classCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
  },
  selectedClassCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  selectedClassName: {
    color: '#007AFF',
  },
  classDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  classStudentCount: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  classClickHint: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  deleteClassButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 6,
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  deleteClassButtonText: {
    fontSize: 16,
  },
  emptyAddButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 15,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  studentItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6c757d',
  },
  studentClass: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  attendanceButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  presentButton: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  attendanceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  presentButtonText: {
    color: '#155724',
  },
  disabledButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#adb5bd',
  },
  scheduleWarningText: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
    marginTop: 4,
  },
  scheduleStatusContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
  },
  scheduledStatus: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  notScheduledStatus: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  scheduleStatusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  scheduledStatusText: {
    color: '#155724',
  },
  notScheduledStatusText: {
    color: '#721c24',
  },
  scheduledDatesContainer: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  scheduledDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  scheduledDatesText: {
    fontSize: 12,
    color: '#6c757d',
  },
  calendarHeaderContainer: {
    marginBottom: 15,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  calendarAttendanceSection: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  calendarInstructions: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    margin: 15,
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  calendarLegend: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minWidth: '30%',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6c757d',
  },
  unenrollButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
    borderRadius: 6,
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  unenrollButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#721c24',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  studentsListContainer: {
    flex: 1,
    marginBottom: 20,
  },
  studentSelectItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  studentSelectInfo: {
    flex: 1,
  },
  studentSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  studentSelectEmail: {
    fontSize: 14,
    color: '#6c757d',
  },
  studentEnrolledClasses: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  studentAlreadyEnrolled: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
    marginTop: 2,
    fontStyle: 'italic',
  },
  studentsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  selectedClassIndicator: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  selectedClassText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  selectedClassSubtext: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  selectedClassHeader: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  selectedClassTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  selectedClassDetailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 4,
  },
  selectedClassDescription: {
    fontSize: 14,
    color: '#388e3c',
    fontStyle: 'italic',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  noClassSelectedIndicator: {
    backgroundColor: '#fff3cd',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noClassSelectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  noClassSelectedSubtext: {
    fontSize: 14,
    color: '#856404',
    fontStyle: 'italic',
  },
  classHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedClassInfo: {
    flex: 1,
  },
  changeClassButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  changeClassButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  noClassSelectedHeader: {
    backgroundColor: '#fff3cd',
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    alignItems: 'center',
  },
  noClassSelectedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  noClassSelectedSubtitle: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectClassButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectClassButtonText: {
    color: '#856404',
    fontSize: 16,
    fontWeight: '600',
  },
  classesListContainer: {
    maxHeight: 250,
    marginBottom: 15,
  },
  classSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedClassSelectItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  classSelectInfo: {
    flex: 1,
  },
  classSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  selectedClassSelectName: {
    color: '#1976d2',
  },
  classSelectDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  selectedClassCheckmark: {
    fontSize: 20,
    color: '#4caf50',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  addStudentIcon: {
    fontSize: 20,
    color: '#28a745',
    fontWeight: 'bold',
  },
  emptyStudentsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStudentsText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStudentsSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  date: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 400,
  },
  calendarStyle: {
    height: 350,
  },
  studentListContainer: {
    flex: 1,
    padding: 15,
  },
  statsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  messageCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  messageContent: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 5,
  },
  messageDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  deleteScheduleButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 6,
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  deleteScheduleButtonText: {
    fontSize: 16,
  },
  scheduleCardWithAttendance: {
    backgroundColor: '#f8f9fa',
    borderColor: '#28a745',
    borderWidth: 1,
  },
  attendanceMarkedText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 4,
  },
  deleteScheduleButtonDisabled: {
    backgroundColor: '#e9ecef',
    opacity: 0.6,
  },
  deleteScheduleButtonTextDisabled: {
    color: '#6c757d',
  },
  absentButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  absentButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  notMarkedButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  notMarkedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  attendanceModalAbsentButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  attendanceModalAbsentButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  attendanceModalNotMarkedButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  attendanceModalNotMarkedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    flex: 1,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  attendanceModalStats: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  attendanceModalStatsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  attendanceModalScrollView: {
    maxHeight: 400,
    marginBottom: 15,
  },
  attendanceModalStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  attendanceModalStudentInfo: {
    flex: 1,
  },
  attendanceModalStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  attendanceModalStudentEmail: {
    fontSize: 14,
    color: '#6c757d',
  },
  attendanceModalButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  attendanceModalPresentButton: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  attendanceModalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  attendanceModalPresentButtonText: {
    color: '#155724',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  messageTextAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  pickerButtonTextPlaceholder: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  durationPreview: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  viewProfileButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    alignSelf: 'flex-start',
  },
  viewProfileButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1976D2',
  },
  studentProfileModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    width: '90%',
    maxHeight: '80%',
  },
  studentProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  studentProfileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  studentProfileContent: {
    padding: 20,
  },
  studentProfileAvatar: {
    alignItems: 'center',
    marginBottom: 20,
  },
  studentProfileAvatarText: {
    fontSize: 60,
    textAlign: 'center',
  },
  studentProfileInfo: {
    gap: 16,
  },
  studentProfileField: {
    marginBottom: 16,
  },
  studentProfileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentProfileValue: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  searchIcon: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 8,
  },
  searchResultsCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  pendingInvitationsSection: {
    backgroundColor: '#fff3cd',
    margin: 15,
    marginBottom: 20,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  invitationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  invitationStudentEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: '#999',
  },
  invitationStatus: {
    alignItems: 'flex-end',
  },
  pendingStatus: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '500',
  },
  classSelectorModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  emptyClassContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyClassText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyClassSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  addClassButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  addClassButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // New Class Modal Styles
  newClassModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  newClassModalHeader: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  newClassModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  newClassModalSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 22,
  },
  newClassModalScrollView: {
    maxHeight: 500,
  },
  newClassFormContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  newClassInputSection: {
    marginBottom: 30,
  },
  newClassInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  newClassInputHelper: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 20,
  },
  newClassInput: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  newClassTextArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  newClassModalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingVertical: 25,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 15,
  },
  newClassCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  newClassCancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  newClassCreateButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newClassCreateButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  newClassCreateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Message Modal Styles
  messageModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  messageModalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  messageModalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  messageFormContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  messageInputSection: {
    marginBottom: 20,
  },
  messageInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  messageTextArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  messageModalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  messageCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  messageCancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  messagePostButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messagePostButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  messagePostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Schedule Modal Styles
  scheduleModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  scheduleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleHeaderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scheduleHeaderIconText: {
    fontSize: 24,
  },
  scheduleHeaderText: {
    flex: 1,
  },
  scheduleModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  scheduleModalSubtitle: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 20,
  },
  scheduleScrollView: {
    flex: 1,
  },
  scheduleScrollContent: {
    paddingBottom: 20,
  },
  scheduleFormContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 300,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  scheduleInputHalf: {
    flex: 1,
  },
  scheduleInputSection: {
    marginBottom: 16,
  },
  scheduleInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  schedulePickerButton: {
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  schedulePickerButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  schedulePickerButtonText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  schedulePickerButtonTextPlaceholder: {
    fontSize: 14,
    color: '#6c757d',
  },
  scheduleDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  scheduleDurationInput: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  scheduleDurationUnit: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 6,
  },
  scheduleDurationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  scheduleDurationPreviewIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  scheduleDurationPreviewText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  scheduleInput: {
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  scheduleTextArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  scheduleClassInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 6,
  },
  scheduleClassInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  scheduleClassInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  scheduleClassInfoLabel: {
    fontSize: 12,
    color: '#6c757d',
    width: 70,
  },
  scheduleClassInfoValue: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  scheduleModalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  scheduleCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  scheduleCancelButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleAddButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleAddButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  scheduleAddButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  scheduleAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Add Student Modal Styles
  addStudentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  addStudentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addStudentHeaderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addStudentHeaderIconText: {
    fontSize: 24,
  },
  addStudentHeaderText: {
    flex: 1,
  },
  addStudentModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  addStudentModalSubtitle: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 20,
  },
  addStudentScrollView: {
    flex: 1,
  },
  addStudentFormContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addStudentSearchSection: {
    marginBottom: 24,
  },
  addStudentSearchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  addStudentSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addStudentSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  addStudentSearchIcon: {
    fontSize: 18,
    color: '#6c757d',
    marginLeft: 8,
  },
  addStudentSearchResults: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 8,
    fontWeight: '500',
  },
  addStudentListSection: {
    flex: 1,
  },
  addStudentListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  addStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addStudentItemDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    opacity: 0.7,
  },
  addStudentItemInfo: {
    flex: 1,
  },
  addStudentItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  addStudentItemEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  addStudentEnrolledClasses: {
    fontSize: 12,
    color: '#28a745',
    fontStyle: 'italic',
  },
  addStudentAlreadyEnrolled: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  addStudentItemAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStudentAddIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  addStudentCheckIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  addStudentNoResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  addStudentNoResultsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  addStudentNoResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  addStudentNoResultsSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  addStudentEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  addStudentEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  addStudentEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  addStudentEmptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
  },
  addStudentModalButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addStudentCancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  addStudentCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Attendance Modal Styles
  attendanceModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  attendanceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attendanceHeaderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff3cd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  attendanceHeaderIconText: {
    fontSize: 24,
  },
  attendanceHeaderText: {
    flex: 1,
  },
  attendanceModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  attendanceModalSubtitle: {
    fontSize: 15,
    color: '#6c757d',
    lineHeight: 20,
  },
  attendanceStatsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  attendanceStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  attendanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  attendanceStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  attendanceStatDivider: {
    width: 1,
    backgroundColor: '#dee2e6',
    marginHorizontal: 16,
  },
  attendanceScrollView: {
    flex: 1,
  },
  attendanceStudentsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  attendanceStudentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  attendanceStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceStudentInfo: {
    flex: 1,
  },
  attendanceStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  attendanceStudentEmail: {
    fontSize: 14,
    color: '#6c757d',
  },
  attendanceStatusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceStatusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  attendanceStatusButtonActive: {
    borderWidth: 3,
  },
  attendancePresentButton: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  attendanceAbsentButton: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  attendanceNotMarkedButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#6c757d',
  },
  attendanceStatusButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  attendanceStatusButtonTextActive: {
    color: '#fff',
  },
  attendanceModalButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attendanceDoneButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  attendanceDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
