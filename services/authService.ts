import { auth } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';

// We accept a username/password pair but Firebase email/password requires an email.
// To keep the flow username-driven and simple, we create a synthetic email of the
// form `${username}@mindcare.local`. This keeps usernames anonymous (no real email required).

const syntheticEmail = (username: string) => `${username}@mindcare.local`;

export async function signupWithUsername(username: string, password: string) {
  const email = syntheticEmail(username);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // set displayName to username for convenience
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: username });
  }
  return userCredential.user;
}

export async function loginWithUsername(username: string, password: string) {
  const email = syntheticEmail(username);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logout() {
  await signOut(auth);
}
