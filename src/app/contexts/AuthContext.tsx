import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function syncUserWithFirestore(fbUser: FirebaseUser): Promise<User> {
  const userRef = doc(db, 'users', fbUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      firebase_uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || '',
      phone: '',
      role: 'buyer',
      created_at: serverTimestamp(),
    });
  }

  const data = (await getDoc(userRef)).data()!;
  return {
    id: fbUser.uid,
    email: data.email,
    name: data.name,
    role: data.role,
    phone: data.phone || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let revision = 0;
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      const currentRevision = ++revision;
      setLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userData = await syncUserWithFirestore(fbUser);
          const token = await fbUser.getIdTokenResult();
          if (currentRevision !== revision) return;
          setIsAdmin(token.claims.admin === true);
          setUser(userData);
        } catch (err) {
          if (currentRevision !== revision) return;
          console.error('Firestore sync failed:', err);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => { revision++; unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await syncUserWithFirestore(cred.user);
    await setDoc(doc(db, 'users', cred.user.uid), { name }, { merge: true });
    setUser(await syncUserWithFirestore(cred.user));
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isAdmin, signIn, signUp, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
