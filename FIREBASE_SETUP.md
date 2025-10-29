# Firebase Setup Guide

This guide will help you set up Firebase Authentication and Firestore for ClassConnect.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `class-connect` (or any name you prefer)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Email/Password"
5. Enable "Email/Password" authentication
6. Click "Save"

## Step 3: Set up Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 4: Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "ClassConnect")
5. Copy the Firebase configuration object

## Step 5: Update firebaseConfig.js

Replace the configuration in `firebaseConfig.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 6: Set up Firestore Security Rules

1. Go to "Firestore Database" → "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Classes - instructors can read/write, students can read
    match /classes/{classId} {
      allow read, write: if request.auth != null;
      
      // Students in a class
      match /students/{studentId} {
        allow read, write: if request.auth != null;
      }
      
      // Attendance records
      match /attendance/{attendanceId} {
        allow read, write: if request.auth != null;
      }
      
      // Messages
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Student class assignments
    match /studentClasses/{assignmentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## Step 7: Test the Setup

1. Run your app: `npm start`
2. Try to sign up with a new account
3. Check the Firebase Console to see if the user appears in Authentication
4. Check Firestore to see if data is being created

## Troubleshooting

### Common Issues:

1. **"auth/configuration-not-found" error**:
   - Make sure you've enabled Email/Password authentication in Firebase Console
   - Verify your Firebase configuration is correct

2. **"permission-denied" error**:
   - Check your Firestore security rules
   - Make sure the user is authenticated

3. **"network-request-failed" error**:
   - Check your internet connection
   - Verify your Firebase project is active

### Testing Steps:

1. Create an instructor account first
2. Create a class
3. Add students to the class
4. Post messages
5. Check attendance

## Production Considerations

Before going to production:

1. **Update Security Rules**: Make them more restrictive based on user roles
2. **Enable App Check**: For additional security
3. **Set up Monitoring**: Enable Firebase Performance and Crashlytics
4. **Configure Storage**: If you plan to add file uploads
5. **Set up Cloud Functions**: For advanced features

## Support

If you encounter issues:

1. Check the Firebase Console for error logs
2. Verify your configuration matches the Firebase project
3. Ensure all required services are enabled
4. Check the React Native Firebase documentation for platform-specific issues