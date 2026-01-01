
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
  where: fbWhere 
} = firebaseFirestoreModule as any;

/** 
 * TO HOST: Replace this object with your actual Firebase config from the console.
 * Once this is filled, the app automatically switches from Local Storage to Cloud Firestore.
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

// Persistence Layer for Local Development / Static Hosting
export const getFullDatabase = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let parsed = data ? JSON.parse(data) : { lenders: [], loans: [], payments: [], users: [] };
    
    // Ensure structure
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
  // Initialize with a demo user if empty
  if (store.users.length === 0) {
    store.users = [{ uid: 'demo_user', email: 'demo@example.com', password: '123', emailVerified: true }];
    saveFullDatabase(store);
  }
  return store;
};

export const auth = isCloudEnabled ? cloudAuth : {
  get currentUser() {
    const session = localStorage.getItem(USER_KEY);
    return session ? JSON.parse(session) : null;
  }
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pin: string) => {
  if (isCloudEnabled) return fbSignIn(authObj, email, pin);
  const store = getStore();
  const normalizedEmail = email.trim().toLowerCase();
  const user = store.users.find((u: any) => u.email.toLowerCase() === normalizedEmail && u.password === pin);
  if (!user) throw { code: 'auth/invalid-credential' };
  
  const session = { uid: user.uid, email: user.email, photoURL: user.photoURL, emailVerified: true };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('db-updated'));
  return { user: session };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pin: string, photoURL?: string) => {
  if (isCloudEnabled) {
    const credential = await fbCreateUser(authObj, email, pin);
    if (photoURL && credential.user) await fbUpdateProfile(credential.user, { photoURL });
    return credential;
  }
  const store = getStore();
  const normalizedEmail = email.trim().toLowerCase();
  if (store.users.find((u: any) => u.email.toLowerCase() === normalizedEmail)) throw { code: 'auth/email-already-in-use' };
  
  const newUser = { 
    uid: 'u_' + Math.random().toString(36).substr(2, 9), 
    email: normalizedEmail, 
    password: pin, 
    photoURL: photoURL || null, 
    emailVerified: true 
  };
  store.users.push(newUser);
  saveFullDatabase(store);
  
  const session = { uid: newUser.uid, email: newUser.email, photoURL: newUser.photoURL, emailVerified: true };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('db-updated'));
  return { user: session };
};

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  if (isCloudEnabled) return fbOnAuth(authObj, callback);
  const handleUpdate = () => callback(auth.currentUser);
  callback(auth.currentUser);
  window.addEventListener('db-updated', handleUpdate);
  window.addEventListener('storage', handleUpdate);
  return () => {
    window.removeEventListener('db-updated', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

export const signOut = async () => {
  if (isCloudEnabled) return fbSignOut(cloudAuth);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('db-updated'));
};

export const db = isCloudEnabled ? cloudDb : {};
export const collection = (dbInstance: any, name: string) => isCloudEnabled ? fbCollection(dbInstance, name) : name;
export const doc = (dbInstance: any, colName: string, id: string) => isCloudEnabled ? fbDoc(dbInstance, colName, id) : { colName, id };
export const query = (colRef: any, ...constraints: any[]) => isCloudEnabled ? fbQuery(colRef, ...constraints) : { colName: colRef, constraints };
export const where = (field: string, op: any, value: any) => isCloudEnabled ? fbWhere(field, op, value) : { field, op, value };

export const onSnapshot = (q: any, callback: Function) => {
  if (isCloudEnabled) return fbSnapshot(q, (snapshot) => callback({ docs: snapshot.docs.map(doc => ({ id: doc.id, data: () => doc.data() })) }));
  
  const update = () => {
    const store = getStore();
    const colName = typeof q === 'string' ? q : q.colName;
    let data = store[colName] || [];
    
    // Apply Filters (User based)
    if (q.constraints) {
      q.constraints.forEach((c: any) => {
        data = data.filter((item: any) => item[c.field] === c.value);
      });
    }
    
    callback({ docs: data.map((d: any) => ({ id: d.id, data: () => d })) });
  };
  
  update();
  window.addEventListener('db-updated', update);
  return () => window.removeEventListener('db-updated', update);
};

export const addDoc = async (colRef: any, data: any) => {
  if (isCloudEnabled) return fbAddDoc(colRef, data);
  const store = getStore();
  const colName = colRef as string;
  const currentUser = auth.currentUser;
  
  const newDoc = { 
    ...data, 
    userId: currentUser ? currentUser.uid : 'anonymous', 
    id: 'id_' + Date.now() + Math.random().toString(36).substr(2, 4) 
  };
  
  if (!store[colName]) store[colName] = [];
  store[colName].push(newDoc);
  saveFullDatabase(store);
  return { id: newDoc.id };
};

export const updateDoc = async (docRef: any, data: any) => {
  if (isCloudEnabled) return fbUpdateDoc(docRef, data);
  const store = getStore();
  const { colName, id } = docRef;
  const index = store[colName].findIndex((item: any) => item.id === id);
  if (index !== -1) {
    store[colName][index] = { ...store[colName][index], ...data };
    saveFullDatabase(store);
  }
};

export const deleteDoc = async (docRef: any) => {
  if (isCloudEnabled) return fbDeleteDoc(docRef);
  const store = getStore();
  const { colName, id } = docRef;
  if (!store[colName]) return;
  store[colName] = store[colName].filter((item: any) => item.id !== id);
  saveFullDatabase(store);
};

export const sendPasswordResetEmail = async (authObj: any, email: string) => isCloudEnabled ? fbResetEmail(authObj, email) : Promise.resolve();
export const confirmPasswordReset = async (authObj: any, code: string, pwd: string) => isCloudEnabled ? fbConfirmPasswordReset(authObj, code, pwd) : Promise.resolve();
export const sendEmailVerification = async (user: any) => isCloudEnabled ? fbSendEmailVerification(user) : Promise.resolve();
