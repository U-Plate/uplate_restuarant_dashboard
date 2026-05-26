import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAUOhnoxJwLl_hSjTjZ7rmCtOpW7Vc4zGw',
  authDomain: 'boilerfuel-hello-world.firebaseapp.com',
  projectId: 'boilerfuel-hello-world',
  storageBucket: 'boilerfuel-hello-world.firebasestorage.app',
  messagingSenderId: '29513962283',
  appId: '1:29513962283:web:1cc5075aed1bf004ea2b6e',
  measurementId: 'G-TWKJCMQQP7',
};

export const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

// Keep the user signed in across reloads. Fire-and-forget — the SDK queues
// auth operations behind this initialization promise.
void setPersistence(auth, browserLocalPersistence);
