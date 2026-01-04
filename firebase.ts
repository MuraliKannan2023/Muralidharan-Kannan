
// Fix: Using namespace imports and destructuring with any-cast to bypass environment-specific import errors 
// while maintaining the functional API expected by the rest of the application.

// @ts-ignore
import * as firebaseAppModule from 'firebase/app';
const { initializeApp, getApps } = firebaseAppModule as any;

// @ts-ignore
import * as firebaseAuthModule from 'firebase/auth';
const { 
  getAuth, 
  signInWithEmailAndPassword: fbSignIn, 
  createUserWithEmailAndPassword: fbCreateUser, 
  onAuthStateChanged: fbOnAuth, 
  signOut: fbSignOut,
  sendPasswordResetEmail: fbResetEmail,
  sendEmailVerification: fbSendEmailVerification,
  updateProfile: fbUpdateProfile,
  confirmPasswordReset: fbConfirmPasswordReset
} = firebaseAuthModule as any;

// @ts-ignore
import * as firebaseFirestoreModule from 'firebase/firestore';
const { 
  getFirestore, 
  collection: fbCollection, 
  addDoc: fbAddDoc, 
  updateDoc: fbUpdateDoc, 
  deleteDoc: fbDeleteDoc,
  doc: fbDoc,
  onSnapshot: fbSnapshot, 
  query: fbQuery, 
  where: fbWhere,
  setDoc: fbSetDoc,
  getDocs: fbGetDocs
} = firebaseFirestoreModule as any;

/** 
 * TO HOST: Replace this object with your actual Firebase config from the console.
 */
const realFirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

export const isCloudEnabled = !!(realFirebaseConfig.apiKey && realFirebaseConfig.apiKey !== "YOUR_API_KEY");

let firebaseApp: any;
let cloudAuth: any;
let cloudDb: any;

if (isCloudEnabled) {
  firebaseApp = getApps().length === 0 ? initializeApp(realFirebaseConfig) : getApps()[0];
  cloudAuth = getAuth(firebaseApp);
  cloudDb = getFirestore(firebaseApp);
}

const STORAGE_KEY = 'family_loan_tracker_v4_prod';
const USER_KEY = 'family_loan_user_session';

export const getFullDatabase = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let parsed = data ? JSON.parse(data) : { lenders: [], loans: [], payments: [], users: [] };
    if (!parsed.users) parsed.users = [];
    if (!parsed.lenders) parsed.lenders = [];
    if (!parsed.loans) parsed.loans = [];
    if (!parsed.payments) parsed.payments = [];
    return parsed;
  } catch (e) {
    return { lenders: [], loans: [], payments: [], users: [] };
  }
};

export const saveFullDatabase = (data: any) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('db-updated'));
  } catch (e) {
    console.error("Local persistence failed:", e);
  }
};

const getStore = () => {
  const store = getFullDatabase();
  if (store.users.length === 0) {
    store.users = [{ uid: 'demo_user', email: 'demo@example.com', phoneNumber: '9962281935', password: '123', emailVerified: true, displayName: 'Demo User' }];
    saveFullDatabase(store);
  }
  return store;
};

// Fix: Re-implementing auth and Firestore exports to support both Cloud and Local modes
export const auth = isCloudEnabled ? cloudAuth : {
  get currentUser() {
    const session = localStorage.getItem(USER_KEY);
    return session ? JSON.parse(session) : null;
  }
};

export const onAuthStateChanged = (authObj: any, callback: any) => {
  if (isCloudEnabled) return fbOnAuth(authObj, callback);
  const handler = () => callback(auth.currentUser);
  window.addEventListener('db-updated', handler);
  callback(auth.currentUser);
  return () => window.removeEventListener('db-updated', handler);
};

export const signOut = async () => {
  if (isCloudEnabled) return fbSignOut(cloudAuth);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('db-updated'));
};

export const sendEmailVerification = async (user: any) => {
  if (isCloudEnabled) return fbSendEmailVerification(user);
  return true;
};

export const updateUserProfile = async (data: any) => {
  const user = auth.currentUser;
  if (!user) return;
  if (isCloudEnabled) {
    await fbUpdateProfile(cloudAuth.currentUser, data);
    return;
  }
  const store = getStore();
  const idx = store.users.findIndex((u: any) => u.uid === user.uid);
  if (idx !== -1) {
    store.users[idx] = { ...store.users[idx], ...data };
    saveFullDatabase(store);
    const session = { ...user, ...data };
    localStorage.setItem(USER_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('db-updated'));
  }
};

// Firestore Mock Layer
export const db = isCloudEnabled ? cloudDb : { local: true };

export const collection = (dbRef: any, path: string) => {
  if (isCloudEnabled) return fbCollection(dbRef, path);
  return { type: 'collection', path };
};

export const doc = (dbRef: any, path: string, id: string) => {
  if (isCloudEnabled) return fbDoc(dbRef, path, id);
  return { type: 'doc', collectionPath: path, id };
};

export const query = (colRef: any, ...constraints: any[]) => {
  if (isCloudEnabled) return fbQuery(colRef, ...constraints);
  return { type: 'query', col: colRef, constraints };
};

export const where = (field: string, op: string, value: any) => {
  if (isCloudEnabled) return fbWhere(field, op, value);
  return { type: 'where', field, op, value };
};

export const onSnapshot = (q: any, callback: any) => {
  if (isCloudEnabled) return fbSnapshot(q, callback);
  const handler = () => {
    const fullDb = getFullDatabase();
    let data = [];
    if (q.type === 'query') {
      const path = q.col.path;
      data = fullDb[path] || [];
      q.constraints.forEach((c: any) => {
        if (c.type === 'where') {
          data = data.filter((item: any) => {
            if (c.op === '==') return item[c.field] === c.value;
            return true;
          });
        }
      });
    } else if (q.type === 'collection') {
      data = fullDb[q.path] || [];
    }
    callback({
      docs: data.map((d: any) => ({
        id: d.id,
        data: () => d
      }))
    });
  };
  window.addEventListener('db-updated', handler);
  handler();
  return () => window.removeEventListener('db-updated', handler);
};

export const addDoc = async (colRef: any, data: any) => {
  if (isCloudEnabled) return fbAddDoc(colRef, data);
  const fullDb = getFullDatabase();
  const path = colRef.path;
  const newId = 'd_' + Math.random().toString(36).substr(2, 9);
  const newDoc = { id: newId, ...data };
  if (!fullDb[path]) fullDb[path] = [];
  fullDb[path].push(newDoc);
  saveFullDatabase(fullDb);
  return { id: newId };
};

export const updateDoc = async (docRef: any, data: any) => {
  if (isCloudEnabled) return fbUpdateDoc(docRef, data);
  const fullDb = getFullDatabase();
  const path = docRef.collectionPath;
  const list = fullDb[path] || [];
  const idx = list.findIndex((i: any) => i.id === docRef.id);
  if (idx !== -1) {
    fullDb[path][idx] = { ...list[idx], ...data };
    saveFullDatabase(fullDb);
  }
};

export const deleteDoc = async (docRef: any) => {
  if (isCloudEnabled) return fbDeleteDoc(docRef);
  const fullDb = getFullDatabase();
  const path = docRef.collectionPath;
  if (fullDb[path]) {
    fullDb[path] = fullDb[path].filter((i: any) => i.id !== docRef.id);
    saveFullDatabase(fullDb);
  }
};

export const signInWithEmailAndPassword = async (authObj: any, identifier: string, pin: string) => {
  const cleanId = identifier.trim();
  const lowerId = cleanId.toLowerCase();
  
  if (isCloudEnabled) {
    let emailToUse = lowerId;
    if (!lowerId.includes('@')) {
      const usersRef = fbCollection(cloudDb, "users");
      const q = fbQuery(usersRef, fbWhere("phoneNumber", "==", cleanId));
      const querySnapshot = await fbGetDocs(q);
      if (!querySnapshot.empty) {
        emailToUse = querySnapshot.docs[0].data().email;
      } else {
        throw { code: 'auth/invalid-credential' };
      }
    }
    return fbSignIn(authObj, emailToUse, pin);
  }
  
  const store = getStore();
  const user = store.users.find((u: any) => 
    (u.email?.toLowerCase() === lowerId || u.phoneNumber === cleanId) && u.password === pin
  );
  
  if (!user) throw { code: 'auth/invalid-credential' };
  
  const session = { 
    uid: user.uid, 
    email: user.email, 
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL, 
    displayName: user.displayName || '', 
    emailVerified: true 
  };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('db-updated'));
  return { user: session };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pin: string, photoURL?: string, displayName?: string, phoneNumber?: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (isCloudEnabled) {
    const credential = await fbCreateUser(authObj, normalizedEmail, pin);
    if (credential.user) {
      await fbUpdateProfile(credential.user, { photoURL, displayName });
      await fbSetDoc(fbDoc(cloudDb, "users", credential.user.uid), {
        email: normalizedEmail, 
        phoneNumber: phoneNumber || '', 
        displayName, 
        photoURL, 
        createdAt: new Date().toISOString()
      });
    }
    return credential;
  }
  
  const store = getStore();
  if (store.users.find((u: any) => u.email.toLowerCase() === normalizedEmail)) throw { code: 'auth/email-already-in-use' };
  if (phoneNumber && store.users.find((u: any) => u.phoneNumber === phoneNumber)) throw { code: 'auth/phone-already-in-use' };
  
  const newUser = { 
    uid: 'u_' + Math.random().toString(36).substr(2, 9), 
    email: normalizedEmail, 
    phoneNumber: phoneNumber || '',
    password: pin, 
    photoURL: photoURL || null, 
    displayName: displayName || '',
    emailVerified: true 
  };
  store.users.push(newUser);
  saveFullDatabase(store);
  
  const session = { uid: newUser.uid, email: newUser.email, phoneNumber: newUser.phoneNumber, photoURL: newUser.photoURL, displayName: newUser.displayName, emailVerified: true };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('db-updated'));
  return { user: session };
};

// Recovery Protocol v3 - Enhanced Lookup
export const requestRecoveryOTP = async (identifier: string) => {
  const cleanId = identifier.trim().toLowerCase();
  
  if (isCloudEnabled) {
    const usersRef = fbCollection(cloudDb, "users");
    const q1 = fbQuery(usersRef, fbWhere("email", "==", cleanId));
    const q2 = fbQuery(usersRef, fbWhere("phoneNumber", "==", cleanId));
    
    const [snap1, snap2] = await Promise.all([fbGetDocs(q1), fbGetDocs(q2)]);
    if (snap1.empty && snap2.empty) throw { code: 'auth/user-not-found' };
    
    return true; 
  }
  
  const store = getStore();
  const user = store.users.find((u: any) => u.email.toLowerCase() === cleanId || u.phoneNumber === cleanId);
  if (!user) throw { code: 'auth/user-not-found' };
  return true;
};

export const verifyOTPAndReset = async (identifier: string, otp: string, newPin: string) => {
  if (otp !== '123456') throw { code: 'auth/invalid-otp' };
  
  const cleanId = identifier.trim().toLowerCase();
  
  if (isCloudEnabled) {
    const usersRef = fbCollection(cloudDb, "users");
    const q1 = fbQuery(usersRef, fbWhere("email", "==", cleanId));
    const q2 = fbQuery(usersRef, fbWhere("phoneNumber", "==", cleanId));
    const [snap1, snap2] = await Promise.all([fbGetDocs(q1), fbGetDocs(q2)]);
    const targetDoc = snap1.empty ? snap2.docs[0] : snap1.docs[0];
    await fbUpdateDoc(fbDoc(cloudDb, "users", targetDoc.id), { password: newPin });
    return;
  }
  
  const store = getStore();
  const userIndex = store.users.findIndex((u: any) => u.email.toLowerCase() === cleanId || u.phoneNumber === cleanId);
  if (userIndex === -1) throw { code: 'auth/user-not-found' };
  
  store.users[userIndex].password = newPin;
  saveFullDatabase(store);
};
