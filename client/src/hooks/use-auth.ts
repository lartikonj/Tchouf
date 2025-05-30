import { useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AuthUser {
  id?: number;
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [processedUids, setProcessedUids] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try to get user from our database
          const response = await fetch(`/api/users/uid/${firebaseUser.uid}`);

          if (response.ok) {
            const dbUser = await response.json();
            setUser(dbUser);
            setProcessedUids(prev => new Set(prev).add(firebaseUser.uid));
          } else if (response.status === 404 && !creatingUser && !processedUids.has(firebaseUser.uid)) {
            // User doesn't exist in our database, create them
            console.log('Creating new user for UID:', firebaseUser.uid);
            setCreatingUser(true);
            setProcessedUids(prev => new Set(prev).add(firebaseUser.uid));
            
            // Parse displayName into firstName and lastName
            const fullName = firebaseUser.displayName || '';
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            // Generate proper displayName
            const displayName = firstName && lastName 
              ? `${firstName} ${lastName.charAt(0)}.`
              : firebaseUser.displayName || `${firstName}`;
            
            const newUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              firstName,
              lastName,
              displayName,
              photoURL: firebaseUser.photoURL,
            };

            try {
              const createResponse = await apiRequest('POST', '/api/users', newUser);
              const createdUser = await createResponse.json();
              setUser(createdUser);
            } catch (createError) {
              console.error('Error creating user:', createError);
              // Fallback to Firebase user data
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });
            } finally {
              setCreatingUser(false);
            }
          }
        } catch (error) {
          console.error('Error syncing user:', error);
          // Fallback to Firebase user data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        }
      } else {
        setUser(null);
        setCreatingUser(false);
        setProcessedUids(new Set()); // Clear processed UIDs on logout
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [creatingUser, processedUids]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile if displayName provided and not using emulator
      if (displayName && result.user && typeof result.user.updateProfile === 'function') {
        try {
          await result.user.updateProfile({ displayName });
        } catch (updateError) {
          console.log('Profile update not supported in emulator');
        }
      }

      toast({
        title: "Success",
        description: "Account created successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Success",
        description: "Signed in with Google successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast({
        title: "Success",
        description: "Signed out successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  };
}