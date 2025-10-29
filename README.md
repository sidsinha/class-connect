# ClassConnect

A comprehensive class management application with student and instructor roles, built with React Native and Firebase.

## Features

### Authentication System
- **Email/Password Login**: Secure authentication using Firebase Auth
- **Role-based Access**: Separate interfaces for Students and Instructors
- **User Registration**: Sign up with role selection (Student/Instructor)

### Student Features
- **Dashboard**: View assigned classes and instructor messages
- **Message Viewing**: Read messages posted by instructors
- **Class Information**: See details about enrolled classes

### Instructor Features
- **Class Management**: Create and manage classes
- **Student Management**: Add students to classes with email invitations
- **Attendance Tracking**: Mark student attendance for specific dates
- **Message System**: Post messages to students in each class
- **Real-time Updates**: Live synchronization with Firebase

### Technical Features
- **Offline Support**: Works without internet connection with local storage
- **Firebase Integration**: Real-time database and authentication
- **Responsive Design**: Optimized for mobile devices
- **Cross-platform**: Works on both iOS and Android

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Expo CLI
- Firebase project setup

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Update `firebaseConfig.js` with your Firebase project credentials
   - Enable Authentication in Firebase Console
   - Set up Firestore database

3. Start the development server:
```bash
npm start
```

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Update the configuration in `firebaseConfig.js`

## Usage

### For Students
1. Sign up with email and password, selecting "Student" role
2. Wait for instructor to assign you to classes
3. View messages from instructors
4. Check class information

### For Instructors
1. Sign up with email and password, selecting "Instructor" role
2. Create classes
3. Add students by email (they'll receive login credentials)
4. Post messages to students
5. Track attendance

## Project Structure

```
class-connect/
├── components/
│   ├── LoginScreen.js          # Authentication interface
│   ├── StudentDashboard.js     # Student main interface
│   └── InstructorDashboard.js  # Instructor main interface
├── authService.js              # Authentication logic
├── dataService.js              # Data management and Firebase operations
├── firebaseConfig.js           # Firebase configuration
└── App.js                      # Main application component
```

## Data Models

### User
- `uid`: Firebase user ID
- `email`: User email
- `role`: 'student' or 'instructor'
- `name`: User's full name

### Class
- `id`: Unique class identifier
- `name`: Class name
- `description`: Class description
- `createdAt`: Creation timestamp

### Student Class Assignment
- `studentId`: Reference to student user
- `classId`: Reference to class
- `assignedAt`: Assignment timestamp

### Message
- `id`: Unique message identifier
- `title`: Message title
- `content`: Message content
- `instructorId`: Reference to instructor
- `instructorName`: Instructor display name
- `createdAt`: Creation timestamp

### Attendance
- `studentId_date`: Composite key for attendance record
- `present`: Boolean attendance status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.