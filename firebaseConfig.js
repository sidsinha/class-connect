import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID
} from '@env';



// Prefer EXPO_PUBLIC_* envs in production builds (EAS), fallback to @env for local
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || FIREBASE_API_KEY || undefined,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || FIREBASE_AUTH_DOMAIN || undefined,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID || undefined,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || FIREBASE_APP_ID || undefined,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || FIREBASE_MEASUREMENT_ID || undefined
};

// Validate required Firebase config values
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Firebase configuration error: Missing required fields:', missingFields.join(', '));
  console.error('💡 For production builds, set EXPO_PUBLIC_FIREBASE_* environment variables in EAS');
  console.error('💡 For local development, ensure .env file exists with all FIREBASE_* variables');
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
