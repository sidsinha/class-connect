# Components Refactoring Guide

## ✅ Completed

### 1. Folder Structure Created
- `components/auth/` - Authentication screens (LoginScreen, EmailVerificationScreen, RoleSelectionScreen)
- `components/onboarding/` - Onboarding flow
- `components/instructor/` - Instructor-specific components
- `components/student/` - Student-specific components
- `components/shared/` - Shared reusable components
- `components/common/` - Common utilities (DebugHelper)

### 2. Shared Components Created
- `components/shared/avatar-picker/AvatarPicker.js` - Reusable avatar selection modal
- `components/shared/image-picker/ImagePickerModal.js` - Reusable image picker modal

### 3. Student Components Extracted
- `components/student/invitations/ClassInvitations.js` - Class invitation handling component

### 4. Files Moved
- Profile components moved to their respective folders:
  - `components/instructor/InstructorProfile.js`
  - `components/student/StudentProfile.js`

### 5. Imports Updated
- `App.js` - Updated all component imports
- `StudentDashboard.js` - Updated to use extracted components
- `InstructorDashboard.js` - Updated Profile import

---

## 🚧 Recommended Next Steps

### StudentDashboard Refactoring

**Current State:** ~908 lines in single file

**Recommended Extractions:**

1. **Messages Component** (`components/student/messages/MessagesList.js`)
   - Extract `renderMessage` function
   - Extract messages display logic (lines ~116-127, ~433-460, ~244-284)
   - Extract full messages screen view (lines ~244-284)

2. **Schedules Component** (`components/student/schedules/SchedulesList.js`)
   - Extract `renderSchedule` function
   - Extract schedules display logic (lines ~129-144, ~463-492, ~288-328)
   - Extract full schedules screen view (lines ~288-328)

3. **Class List Component** (`components/student/ClassList.js`)
   - Extract `renderClassItem` function (lines ~146-170)
   - Extract class selection logic

4. **Tab Navigation** (`components/student/TabNavigation.js`)
   - Extract tab switching UI (lines ~411-428)

### InstructorDashboard Refactoring

**Current State:** ~4369 lines in single file (⚠️ Very Large!)

**Recommended Extractions (High Priority):**

1. **Class Management** (`components/instructor/class-management/`)
   - `ClassList.js` - Display and select classes
   - `AddClassModal.js` - Create new class modal
   - `ClassSelector.js` - Class selection dropdown

2. **Student Management** (`components/instructor/student-management/`)
   - `StudentList.js` - Display students
   - `AddStudentModal.js` - Add student to class modal
   - `StudentSearch.js` - Student search functionality

3. **Attendance** (`components/instructor/attendance/`)
   - `AttendanceCalendar.js` - Calendar view for attendance
   - `AttendanceModal.js` - Mark attendance modal
   - `AttendanceList.js` - List view of attendance records

4. **Messages** (`components/instructor/messages/`)
   - `MessageComposer.js` - Create new message modal
   - `MessagesList.js` - Display messages

5. **Schedules** (`components/instructor/schedules/`)
   - `ScheduleForm.js` - Create/edit schedule modal
   - `SchedulesList.js` - Display schedules
   - `ScheduleCalendar.js` - Calendar integration

6. **Shared Utilities**
   - Extract date/time picker logic
   - Extract form validation logic
   - Extract data loading hooks

### Profile Components Refactoring

**Recommended:**

1. **Create Shared Profile Form** (`components/shared/profile-form/ProfileForm.js`)
   - Extract form fields (firstName, lastName, email, phone)
   - Extract validation logic
   - Extract save/cancel handlers

2. **Update Profile Components**
   - Use shared `AvatarPicker` component (already created)
   - Use shared `ImagePickerModal` component (already created)
   - Use shared `ProfileForm` component (to be created)

---

## 📝 Refactoring Pattern

### Example: Extracting a Component

**Before (in large file):**
```javascript
const renderMessage = ({ item }) => (
  <View style={styles.messageCard}>
    {/* ... */}
  </View>
);
```

**After (separate file `components/student/messages/MessageCard.js`):**
```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MessageCard({ message }) {
  return (
    <View style={styles.messageCard}>
      {/* ... */}
    </View>
  );
}

const styles = StyleSheet.create({
  // Extract relevant styles
});
```

**Update main file:**
```javascript
import MessageCard from './messages/MessageCard';

// In render:
{messages.map((item) => (
  <MessageCard key={item.id} message={item} />
))}
```

---

## 🔍 Finding What to Extract

### Look for:
1. **Large render functions** (>50 lines)
2. **Repeated UI patterns** (extract to shared)
3. **Modal components** (always extract)
4. **Form logic** (extract with validation)
5. **List rendering** (extract list components)
6. **Separate view modes** (extract as separate screens/components)

### Size Guidelines:
- **< 200 lines:** Usually fine as single component
- **200-400 lines:** Consider extracting sub-components
- **> 400 lines:** Should be broken into smaller pieces
- **> 1000 lines:** Definitely needs refactoring

---

## ⚠️ Important Notes

1. **Update all imports** when moving files
2. **Move related styles** to extracted components
3. **Test after each extraction** to ensure functionality works
4. **Keep related functionality together** (e.g., all attendance logic in one folder)
5. **Use index.js files** for cleaner imports (`export { default } from './Component'`)

---

## 📂 Final Folder Structure Goal

```
components/
├── auth/
│   ├── LoginScreen.js
│   ├── EmailVerificationScreen.js
│   └── RoleSelectionScreen.js
├── onboarding/
│   └── OnboardingScreen.js
├── instructor/
│   ├── InstructorDashboard.js (main orchestrator, ~200-300 lines)
│   ├── InstructorProfile.js
│   ├── class-management/
│   │   ├── ClassList.js
│   │   ├── AddClassModal.js
│   │   └── ClassSelector.js
│   ├── student-management/
│   │   ├── StudentList.js
│   │   ├── AddStudentModal.js
│   │   └── StudentSearch.js
│   ├── attendance/
│   │   ├── AttendanceCalendar.js
│   │   ├── AttendanceModal.js
│   │   └── AttendanceList.js
│   ├── messages/
│   │   ├── MessageComposer.js
│   │   └── MessagesList.js
│   └── schedules/
│       ├── ScheduleForm.js
│       ├── SchedulesList.js
│       └── ScheduleCalendar.js
├── student/
│   ├── StudentDashboard.js (main orchestrator, ~200-300 lines)
│   ├── StudentProfile.js
│   ├── messages/
│   │   ├── MessagesList.js
│   │   └── MessageCard.js
│   ├── schedules/
│   │   ├── SchedulesList.js
│   │   └── ScheduleCard.js
│   ├── invitations/
│   │   └── ClassInvitations.js ✅
│   └── ClassList.js
├── shared/
│   ├── avatar-picker/
│   │   ├── AvatarPicker.js ✅
│   │   └── index.js ✅
│   ├── image-picker/
│   │   ├── ImagePickerModal.js ✅
│   │   └── index.js ✅
│   └── profile-form/
│       ├── ProfileForm.js (to be created)
│       ├── ProfileValidation.js
│       └── index.js
└── common/
    └── DebugHelper.js ✅
```

---

## 🎯 Priority Order

1. ✅ **Done:** Folder structure, shared components, basic extractions
2. **Next:** Complete StudentDashboard refactoring (smaller, easier)
3. **Then:** Start InstructorDashboard refactoring (large, break into phases)
4. **Finally:** Profile components refactoring (extract shared form)

---

## 💡 Tips

- Extract one component at a time
- Test after each extraction
- Use git commits after each successful extraction
- Keep the main dashboard files as orchestrators (import and coordinate sub-components)
- Extract modals and complex UI as separate components first

