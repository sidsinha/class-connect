import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import authService from './authService';

class DataService {
  constructor() {
    this.isOnline = false;
    this.currentClassId = null;
    this.setupOnlineListener();
  }

  setupOnlineListener() {
    // Simple online check - in a real app you'd use NetInfo
    this.isOnline = true; // For now, assume online
  }

  setCurrentClass(classId) {
    this.currentClassId = classId;
  }

  getCurrentClass() {
    return this.currentClassId;
  }

  // Classes CRUD operations
  async getClasses(instructorId = null) {
    try {
      if (this.isOnline) {
        let classesSnapshot;
        if (instructorId) {
          // Filter classes by instructor ID
          const q = query(
            collection(db, 'classes'),
            where('instructorId', '==', instructorId)
          );
          classesSnapshot = await getDocs(q);
        } else {
          // Get all classes (for admin purposes)
          classesSnapshot = await getDocs(collection(db, 'classes'));
        }
        
        const classes = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return classes;
      } else {
        const savedClasses = await AsyncStorage.getItem('classes');
        const allClasses = savedClasses ? JSON.parse(savedClasses) : [];
        
        // Filter by instructor ID in offline mode
        if (instructorId) {
          return allClasses.filter(classItem => classItem.instructorId === instructorId);
        }
        return allClasses;
      }
    } catch (error) {
      console.error('Error getting classes:', error);
      const savedClasses = await AsyncStorage.getItem('classes');
      const allClasses = savedClasses ? JSON.parse(savedClasses) : [];
      
      // Filter by instructor ID in offline mode
      if (instructorId) {
        return allClasses.filter(classItem => classItem.instructorId === instructorId);
      }
      return allClasses;
    }
  }

  async saveClass(classData) {
    try {
      if (this.isOnline) {
        await setDoc(doc(db, 'classes', classData.id), {
          name: classData.name,
          description: classData.description || '',
          instructorId: classData.instructorId,
          instructorName: classData.instructorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Always save locally as backup
      const savedClasses = await AsyncStorage.getItem('classes');
      const classes = savedClasses ? JSON.parse(savedClasses) : [];
      const existingIndex = classes.findIndex(c => c.id === classData.id);
      
      if (existingIndex >= 0) {
        classes[existingIndex] = classData;
      } else {
        classes.push(classData);
      }
      
      await AsyncStorage.setItem('classes', JSON.stringify(classes));
      return true;
    } catch (error) {
      console.error('Error saving class:', error);
      return false;
    }
  }

  async deleteClass(classId) {
    try {
      if (this.isOnline) {
        await deleteDoc(doc(db, 'classes', classId));
      }
      
      // Remove from local storage
      const savedClasses = await AsyncStorage.getItem('classes');
      if (savedClasses) {
        const classes = JSON.parse(savedClasses);
        const updatedClasses = classes.filter(c => c.id !== classId);
        await AsyncStorage.setItem('classes', JSON.stringify(updatedClasses));
      }
      return true;
    } catch (error) {
      console.error('Error deleting class:', error);
      return false;
    }
  }

  // Students CRUD operations
  async getStudents(classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return [];
    
    try {
      if (this.isOnline) {
        // Get students from studentClasses collection where classId matches
        const assignmentsSnapshot = await getDocs(
          query(
            collection(db, 'studentClasses'),
            where('classId', '==', targetClassId)
          )
        );
        
        const students = assignmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.studentId,
            name: data.name,
            email: data.email,
            classId: data.classId,
            assignedAt: data.assignedAt
          };
        });
        
        return students;
      } else {
        // For offline mode, we need to get all student assignments and filter
        const allAssignments = [];
        // This is a simplified approach - in a real app you'd want to cache this better
        const savedStudents = await AsyncStorage.getItem(`students_${targetClassId}`);
        return savedStudents ? JSON.parse(savedStudents) : [];
      }
    } catch (error) {
      console.error('Error getting students:', error);
      const savedStudents = await AsyncStorage.getItem(`students_${targetClassId}`);
      return savedStudents ? JSON.parse(savedStudents) : [];
    }
  }

  async saveStudents(students, classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return false;
    
    try {
      if (this.isOnline) {
        // Save to Firebase
        for (const student of students) {
          await setDoc(doc(db, `classes/${targetClassId}/students`, student.id), {
            name: student.name,
            createdAt: new Date().toISOString()
          });
        }
      }
      
      // Always save locally as backup
      await AsyncStorage.setItem(`students_${targetClassId}`, JSON.stringify(students));
      return true;
    } catch (error) {
      console.error('Error saving students:', error);
      await AsyncStorage.setItem(`students_${targetClassId}`, JSON.stringify(students));
      return false;
    }
  }

  async deleteStudent(studentId, classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return false;
    
    try {
      if (this.isOnline) {
        await deleteDoc(doc(db, `classes/${targetClassId}/students`, studentId));
      }
      
      // Remove from local storage
      const savedStudents = await AsyncStorage.getItem(`students_${targetClassId}`);
      if (savedStudents) {
        const students = JSON.parse(savedStudents);
        const updatedStudents = students.filter(s => s.id !== studentId);
        await AsyncStorage.setItem(`students_${targetClassId}`, JSON.stringify(updatedStudents));
      }
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  // Attendance CRUD operations
  async getAttendance(classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return {};
    
    try {
      if (this.isOnline) {
        const attendanceSnapshot = await getDocs(collection(db, `classes/${targetClassId}/attendance`));
        const attendance = {};
        attendanceSnapshot.docs.forEach(doc => {
          attendance[doc.id] = doc.data().present;
        });
        return attendance;
      } else {
        const savedAttendance = await AsyncStorage.getItem(`attendance_${targetClassId}`);
        return savedAttendance ? JSON.parse(savedAttendance) : {};
      }
    } catch (error) {
      console.error('Error getting attendance:', error);
      const savedAttendance = await AsyncStorage.getItem(`attendance_${targetClassId}`);
      return savedAttendance ? JSON.parse(savedAttendance) : {};
    }
  }


  async saveAttendance(attendance, classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return false;
    
    try {
      // Extract dates from attendance keys and validate they are scheduled
      const attendanceDates = new Set();
      Object.keys(attendance).forEach(key => {
        const [studentId, date] = key.split('_');
        attendanceDates.add(date);
      });
      
      // Check if all dates are scheduled
      for (const date of attendanceDates) {
        const isScheduled = await this.isDateScheduled(targetClassId, date);
        if (!isScheduled) {
          console.warn(`Attendance cannot be saved for unscheduled date: ${date}`);
          // Continue saving but log warning
        }
      }
      
      if (this.isOnline) {
        // Get existing attendance to find deleted keys
        const existingAttendance = await this.getAttendance(targetClassId);
        const existingKeys = Object.keys(existingAttendance);
        const newKeys = Object.keys(attendance);
        
        // Find keys that were deleted
        const deletedKeys = existingKeys.filter(key => !newKeys.includes(key));
        
        // Delete removed attendance records from Firebase
        for (const key of deletedKeys) {
          try {
            await deleteDoc(doc(db, `classes/${targetClassId}/attendance`, key));
          } catch (error) {
            console.error('Error deleting attendance record:', error);
          }
        }
        
        // Save/update remaining attendance records
        for (const [key, value] of Object.entries(attendance)) {
          await setDoc(doc(db, `classes/${targetClassId}/attendance`, key), {
            present: value,
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      // Always save locally as backup
      await AsyncStorage.setItem(`attendance_${targetClassId}`, JSON.stringify(attendance));
      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      await AsyncStorage.setItem(`attendance_${targetClassId}`, JSON.stringify(attendance));
      return false;
    }
  }

  // Get attendance status for a student on a specific date
  // Returns: 'present', 'absent', or 'not_marked'
  async getAttendanceStatus(studentId, date, classId = null) {
    try {
      const targetClassId = classId || this.currentClassId;
      if (!targetClassId) return 'not_marked';
      
      const attendanceKey = `${studentId}_${date}`;
      const attendance = await this.getAttendance(targetClassId);
      
      if (attendance[attendanceKey] === true) return 'present';
      if (attendance[attendanceKey] === false) return 'absent';
      return 'not_marked';
    } catch (error) {
      console.error('Error getting attendance status:', error);
      return 'not_marked';
    }
  }

  // Real-time listeners
  setupStudentsListener(callback, classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (this.isOnline && targetClassId) {
      const q = query(collection(db, `classes/${targetClassId}/students`), orderBy('createdAt', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const students = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(students);
      });
    }
    return null;
  }

  setupAttendanceListener(callback, classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (this.isOnline && targetClassId) {
      return onSnapshot(collection(db, `classes/${targetClassId}/attendance`), (snapshot) => {
        const attendance = {};
        snapshot.docs.forEach(doc => {
          attendance[doc.id] = doc.data().present;
        });
        callback(attendance);
      });
    }
    return null;
  }

  // Messages CRUD operations
  async getMessages(classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return [];
    
    try {
      if (this.isOnline) {
        const messagesSnapshot = await getDocs(
          query(
            collection(db, `classes/${targetClassId}/messages`), 
            orderBy('createdAt', 'desc')
          )
        );
        const messages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return messages;
      } else {
        const savedMessages = await AsyncStorage.getItem(`messages_${targetClassId}`);
        return savedMessages ? JSON.parse(savedMessages) : [];
      }
    } catch (error) {
      console.error('Error getting messages:', error);
      const savedMessages = await AsyncStorage.getItem(`messages_${targetClassId}`);
      return savedMessages ? JSON.parse(savedMessages) : [];
    }
  }

  async saveMessage(messageData, classId = null) {
    const targetClassId = classId || this.currentClassId;
    if (!targetClassId) return false;
    
    const message = {
      id: messageData.id || Date.now().toString(),
      title: messageData.title,
      content: messageData.content,
      instructorId: authService.getCurrentUser()?.uid,
      instructorName: messageData.instructorName || 'Instructor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (this.isOnline) {
        await setDoc(doc(db, `classes/${targetClassId}/messages`, message.id), message);
      }
      
      // Always save locally as backup
      const savedMessages = await AsyncStorage.getItem(`messages_${targetClassId}`);
      const messages = savedMessages ? JSON.parse(savedMessages) : [];
      const existingIndex = messages.findIndex(m => m.id === message.id);
      
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.unshift(message);
      }
      
      await AsyncStorage.setItem(`messages_${targetClassId}`, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      return false;
    }
  }

  // Get user profile by ID
  async getUserProfile(userId) {
    try {
      if (this.isOnline) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return { id: userDoc.id, ...userDoc.data() };
        }
        return null;
      } else {
        const savedUsers = await AsyncStorage.getItem('allUsers');
        if (savedUsers) {
          const users = JSON.parse(savedUsers);
          return users.find(user => user.id === userId) || null;
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId, profileData) {
    try {
      if (this.isOnline) {
        await setDoc(doc(db, 'users', userId), profileData, { merge: true });
      }
      
      // Always save locally as backup
      await this.saveUserProfileLocally(profileData);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // Save user profile locally
  async saveUserProfileLocally(profileData) {
    try {
      // Update in allUsers
      const savedUsers = await AsyncStorage.getItem('allUsers');
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        const userIndex = users.findIndex(user => user.id === profileData.id);
        if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...profileData };
        } else {
          users.push(profileData);
        }
        await AsyncStorage.setItem('allUsers', JSON.stringify(users));
      }

      // Save individual profile
      await AsyncStorage.setItem(`userProfile_${profileData.id}`, JSON.stringify(profileData));
      return true;
    } catch (error) {
      console.error('Error saving user profile locally:', error);
      return false;
    }
  }

  // Save pending invitation
  async savePendingInvitation(invitation) {
    try {
      if (this.isOnline) {
        await setDoc(doc(db, 'pendingInvitations', invitation.id), invitation);
      }
      
      // Save locally as backup
      const savedInvitations = await AsyncStorage.getItem('pendingInvitations');
      const invitations = savedInvitations ? JSON.parse(savedInvitations) : [];
      const existingIndex = invitations.findIndex(inv => inv.id === invitation.id);
      
      if (existingIndex >= 0) {
        invitations[existingIndex] = invitation;
      } else {
        invitations.push(invitation);
      }
      
      await AsyncStorage.setItem('pendingInvitations', JSON.stringify(invitations));
      return true;
    } catch (error) {
      console.error('Error saving pending invitation:', error);
      return false;
    }
  }

  // Get pending invitations for a student
  async getPendingInvitations(studentId) {
    try {
      if (this.isOnline) {
        const invitationsSnapshot = await getDocs(
          query(
            collection(db, 'pendingInvitations'),
            where('studentId', '==', studentId),
            where('status', '==', 'pending')
          )
        );
        return invitationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        const savedInvitations = await AsyncStorage.getItem('pendingInvitations');
        const invitations = savedInvitations ? JSON.parse(savedInvitations) : [];
        return invitations.filter(inv => inv.studentId === studentId && inv.status === 'pending');
      }
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  // Get pending invitations for a specific class
  async getPendingInvitationsForClass(classId) {
    try {
      if (this.isOnline) {
        const invitationsSnapshot = await getDocs(
          query(
            collection(db, 'pendingInvitations'),
            where('classId', '==', classId),
            where('status', '==', 'pending')
          )
        );
        return invitationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        const savedInvitations = await AsyncStorage.getItem('pendingInvitations');
        const invitations = savedInvitations ? JSON.parse(savedInvitations) : [];
        return invitations.filter(inv => inv.classId === classId && inv.status === 'pending');
      }
    } catch (error) {
      console.error('Error getting pending invitations for class:', error);
      return [];
    }
  }

  // Update invitation status (accept/decline)
  async updateInvitationStatus(invitationId, status) {
    try {
      if (this.isOnline) {
        await updateDoc(doc(db, 'pendingInvitations', invitationId), {
          status: status,
          respondedAt: new Date().toISOString()
        });
      }
      
      // Update locally
      const savedInvitations = await AsyncStorage.getItem('pendingInvitations');
      if (savedInvitations) {
        const invitations = JSON.parse(savedInvitations);
        const invitationIndex = invitations.findIndex(inv => inv.id === invitationId);
        if (invitationIndex >= 0) {
          invitations[invitationIndex].status = status;
          invitations[invitationIndex].respondedAt = new Date().toISOString();
          await AsyncStorage.setItem('pendingInvitations', JSON.stringify(invitations));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating invitation status:', error);
      return false;
    }
  }

  // Get all users (both students and instructors)
  async getAllUsers() {
    try {
      if (this.isOnline) {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return users;
      } else {
        const savedUsers = await AsyncStorage.getItem('allUsers');
        return savedUsers ? JSON.parse(savedUsers) : [];
      }
    } catch (error) {
      console.error('Error getting all users:', error);
      const savedUsers = await AsyncStorage.getItem('allUsers');
      return savedUsers ? JSON.parse(savedUsers) : [];
    }
  }

  // Get all registered students (users with role 'student')
  async getAllStudents() {
    try {
      if (this.isOnline) {
        const studentsSnapshot = await getDocs(
          query(
            collection(db, 'users'),
            where('role', '==', 'student')
          )
        );
        const students = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return students;
      } else {
        const savedStudents = await AsyncStorage.getItem('allStudents');
        return savedStudents ? JSON.parse(savedStudents) : [];
      }
    } catch (error) {
      console.error('Error getting all students:', error);
      const savedStudents = await AsyncStorage.getItem('allStudents');
      return savedStudents ? JSON.parse(savedStudents) : [];
    }
  }


  async assignStudentToClass(studentId, classId, studentData = {}) {
    try {
      const assignment = {
        id: `${studentId}_${classId}`,
        studentId,
        classId,
        assignedAt: new Date().toISOString(),
        ...studentData
      };

      if (this.isOnline) {
        await setDoc(doc(db, 'studentClasses', assignment.id), assignment);
      }
      
      // Save locally - this allows multiple assignments per student
      const savedAssignments = await AsyncStorage.getItem(`studentClasses_${studentId}`);
      const assignments = savedAssignments ? JSON.parse(savedAssignments) : [];
      const existingIndex = assignments.findIndex(a => a.id === assignment.id);
      
      if (existingIndex >= 0) {
        assignments[existingIndex] = assignment;
      } else {
        assignments.push(assignment);
      }
      
      await AsyncStorage.setItem(`studentClasses_${studentId}`, JSON.stringify(assignments));
      return true;
    } catch (error) {
      console.error('Error assigning student to class:', error);
      return false;
    }
  }

  // Get all classes for a specific student
  async getStudentClasses(studentId) {
    try {
      if (this.isOnline) {
        const assignmentsSnapshot = await getDocs(
          query(
            collection(db, 'studentClasses'),
            where('studentId', '==', studentId)
          )
        );
        const assignments = assignmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return assignments;
      } else {
        const savedAssignments = await AsyncStorage.getItem(`studentClasses_${studentId}`);
        return savedAssignments ? JSON.parse(savedAssignments) : [];
      }
    } catch (error) {
      console.error('Error getting student classes:', error);
      const savedAssignments = await AsyncStorage.getItem(`studentClasses_${studentId}`);
      return savedAssignments ? JSON.parse(savedAssignments) : [];
    }
  }

  async removeStudentFromClass(studentId, classId) {
    try {
      const assignmentId = `${studentId}_${classId}`;
      
      if (this.isOnline) {
        await deleteDoc(doc(db, 'studentClasses', assignmentId));
      }
      
      // Remove from local storage
      const savedAssignments = await AsyncStorage.getItem(`studentClasses_${studentId}`);
      if (savedAssignments) {
        const assignments = JSON.parse(savedAssignments);
        const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
        await AsyncStorage.setItem(`studentClasses_${studentId}`, JSON.stringify(updatedAssignments));
      }
      return true;
    } catch (error) {
      console.error('Error removing student from class:', error);
      return false;
    }
  }

  // Get classes for a specific student
  async getClassesForStudent(studentId) {
    try {
      const assignments = await this.getStudentClasses(studentId);
      const classIds = assignments.map(a => a.classId);
      
      if (classIds.length === 0) return [];
      
      const classes = [];
      for (const classId of classIds) {
        const classData = await this.getClasses(); // Get all classes for student view
        const classInfo = classData.find(c => c.id === classId);
        if (classInfo) {
          // If class doesn't have instructorName, try to get it from the instructor's profile
          if (!classInfo.instructorName) {
            try {
              // Get all users to find the instructor
              const allUsers = await this.getAllUsers();
              const instructor = allUsers.find(user => user.role === 'instructor');
              if (instructor) {
                classInfo.instructorName = instructor.name || instructor.email?.split('@')[0] || 'Instructor';
              }
            } catch (error) {
              classInfo.instructorName = 'Instructor';
            }
          }
          classes.push(classInfo);
        }
      }
      
      return classes;
    } catch (error) {
      console.error('Error getting classes for student:', error);
      return [];
    }
  }

  // Sync local data to Firebase
  async syncToFirebase() {
    try {
      const students = await AsyncStorage.getItem('students');
      const attendance = await AsyncStorage.getItem('attendance');
      
      if (students) {
        const studentsArray = JSON.parse(students);
        await this.saveStudents(studentsArray);
      }
      
      if (attendance) {
        const attendanceObj = JSON.parse(attendance);
        await this.saveAttendance(attendanceObj);
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing to Firebase:', error);
      return false;
    }
  }

  // Schedule management
  async saveSchedule(scheduleData) {
    try {
      const docRef = await addDoc(collection(db, 'schedules'), {
        ...scheduleData,
        createdAt: new Date().toISOString()
      });
      
      // Save to AsyncStorage for offline access
      const schedules = await this.getSchedulesFromStorage();
      const newSchedule = { id: docRef.id, ...scheduleData };
      schedules.push(newSchedule);
      await AsyncStorage.setItem('schedules', JSON.stringify(schedules));
      
      return docRef.id;
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  }

  async getSchedules(classId) {
    try {
      const q = query(
        collection(db, 'schedules'),
        where('classId', '==', classId)
      );
      const querySnapshot = await getDocs(q);
      
      const schedules = [];
      querySnapshot.forEach((doc) => {
        schedules.push({ id: doc.id, ...doc.data() });
      });
      
      // Save to AsyncStorage for offline access
      await AsyncStorage.setItem('schedules', JSON.stringify(schedules));
      
      return schedules;
    } catch (error) {
      console.error('Error getting schedules:', error);
      // Fallback to AsyncStorage
      return await this.getSchedulesFromStorage(classId);
    }
  }

  async getSchedulesFromStorage(classId = null) {
    try {
      const schedulesData = await AsyncStorage.getItem('schedules');
      const schedules = schedulesData ? JSON.parse(schedulesData) : [];
      
      if (classId) {
        return schedules.filter(schedule => schedule.classId === classId);
      }
      return schedules;
    } catch (error) {
      console.error('Error getting schedules from storage:', error);
      return [];
    }
  }

  async deleteSchedule(scheduleId) {
    try {
      await deleteDoc(doc(db, 'schedules', scheduleId));
      
      // Remove from AsyncStorage
      const schedules = await this.getSchedulesFromStorage();
      const updatedSchedules = schedules.filter(schedule => schedule.id !== scheduleId);
      await AsyncStorage.setItem('schedules', JSON.stringify(updatedSchedules));
      
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  // Check if current date matches any scheduled date for a class
  async isDateScheduled(classId, date = null) {
    try {
      // Always use device local timezone
      let targetDate;
      if (date) {
        // If date is provided as string (YYYY-MM-DD), use it directly
        targetDate = date;
      } else {
        // Use device local timezone for today's date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }
      
      const schedules = await this.getSchedules(classId);
      
      
      return schedules.some(schedule => {
        // Schedule dates are stored as YYYY-MM-DD strings in device timezone
        const isMatch = schedule.date === targetDate;
        return isMatch;
      });
    } catch (error) {
      console.error('Error checking if date is scheduled:', error);
      return false;
    }
  }

  // Get scheduled dates for a class
  async getScheduledDates(classId) {
    try {
      const schedules = await this.getSchedules(classId);
      return schedules.map(schedule => {
        // Schedule dates are stored as YYYY-MM-DD strings, return directly
        return schedule.date;
      });
    } catch (error) {
      console.error('Error getting scheduled dates:', error);
      return [];
    }
  }

  // Check if a scheduled date has attendance marked
  async hasAttendanceForDate(classId, scheduleDate) {
    try {
      const attendance = await this.getAttendance(classId);
      
      // Check if any attendance records exist for this date
      const hasAttendance = Object.keys(attendance).some(key => {
        const [studentId, date] = key.split('_');
        return date === scheduleDate;
      });
      
      
      return hasAttendance;
    } catch (error) {
      console.error('Error checking attendance for date:', error);
      return false;
    }
  }
}

export default new DataService();
