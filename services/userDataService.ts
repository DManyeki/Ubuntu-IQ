import { db } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

// Stores assessment and mood results under a `users/{uid}/sessions` collection.

export async function saveAssessmentForUser(uid: string, payload: any) {
  const col = collection(db, 'users', uid, 'sessions');
  const doc = await addDoc(col, { type: 'assessment', createdAt: Timestamp.now(), payload });
  return doc.id;
}

export async function saveMoodForUser(uid: string, payload: any) {
  const col = collection(db, 'users', uid, 'sessions');
  const doc = await addDoc(col, { type: 'mood', createdAt: Timestamp.now(), payload });
  return doc.id;
}

export async function getSessionsForUser(uid: string) {
  const col = collection(db, 'users', uid, 'sessions');
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
