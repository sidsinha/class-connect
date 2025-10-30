import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.setupAuthListener();
  }

  setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          this.userRole = userDoc.data().role;
        }
      } else {
        this.userRole = null;
      }
    });
  }

  async signUp(email, password, role = 'student', userData = {}) {
    try {
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: role,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        ...userData
      });

      return { success: true, user, emailSent: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        this.userRole = userDoc.data().role;
      } else {
      }

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userRole = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserRole() {
    return this.userRole;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  isInstructor() {
    return this.userRole === 'instructor';
  }

  isStudent() {
    return this.userRole === 'student';
  }

  isEmailVerified() {
    return this.currentUser ? this.currentUser.emailVerified : false;
  }


  async resendVerificationEmail() {
    try {
      // Get current user directly from Firebase auth to ensure we have the latest state
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No user logged in' };
      }

      // Check if email is already verified
      if (currentUser.emailVerified) {
        return { success: false, error: 'Email is already verified' };
      }

      // Send verification email
      await sendEmailVerification(currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendPasswordReset(email) {
    try {
      // Let Firebase handle the email validation directly
      // This will send the reset email if the email exists, or throw an error if it doesn't
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      // Handle specific Firebase errors
      let errorMessage = error.message;
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address. Please check your email or sign up for a new account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      return { success: false, error: errorMessage };
    }
  }
}

export default new AuthService();
