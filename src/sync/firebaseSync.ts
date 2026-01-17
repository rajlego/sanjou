import {
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  Firestore,
} from 'firebase/firestore';
import * as Y from 'yjs';
import { ydoc } from './yjsProvider';
import { initFirebase, isFirebaseConfigured } from './firebaseConfig';
import { getCurrentUser, subscribeToAuthState } from './firebaseAuth';
import type { SyncState } from '../models';

const COLLECTION_NAME = 'sync';
const ANONYMOUS_DOC_ID = 'sanjou-sync-anonymous';

const getSyncDocId = (): string => {
  const user = getCurrentUser();
  return user ? user.uid : ANONYMOUS_DOC_ID;
};

let unsubscribe: Unsubscribe | null = null;
let syncState: SyncState = 'offline';
let syncStateListeners: Set<(state: SyncState) => void> = new Set();

const setSyncState = (state: SyncState) => {
  syncState = state;
  syncStateListeners.forEach(listener => listener(state));
};

export const getSyncState = (): SyncState => syncState;

export const subscribeSyncState = (callback: (state: SyncState) => void) => {
  syncStateListeners.add(callback);
  callback(syncState);
  return () => syncStateListeners.delete(callback);
};

const encodeUpdate = (update: Uint8Array): string => {
  return btoa(String.fromCharCode(...update));
};

const decodeUpdate = (encoded: string): Uint8Array => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const initFirebaseSync = async (): Promise<void> => {
  if (!isFirebaseConfigured()) {
    console.log('[Sync] Firebase not configured, skipping sync setup');
    setSyncState('offline');
    return;
  }

  const db = initFirebase();
  if (!db) {
    setSyncState('error');
    return;
  }

  setSyncState('syncing');

  try {
    await setupSync(db);
    setSyncState('synced');
  } catch (error) {
    console.error('[Sync] Failed to setup:', error);
    setSyncState('error');
  }
};

const setupSync = async (db: Firestore): Promise<void> => {
  const syncDocRef = doc(db, COLLECTION_NAME, getSyncDocId());

  // Listen for remote changes
  unsubscribe = onSnapshot(
    syncDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.update && data.origin !== getClientId()) {
          try {
            const update = decodeUpdate(data.update);
            Y.applyUpdate(ydoc, update, 'firebase');
            console.log('[Sync] Applied remote update');
          } catch (error) {
            console.error('[Sync] Failed to apply remote update:', error);
          }
        }
      }
      setSyncState('synced');
    },
    (error) => {
      console.error('[Sync] Snapshot error:', error);
      setSyncState('offline');
    }
  );

  // Push local changes
  ydoc.on('update', async (update: Uint8Array, origin: string) => {
    if (origin === 'firebase') return; // Don't re-sync changes from firebase

    setSyncState('syncing');
    try {
      await setDoc(syncDocRef, {
        update: encodeUpdate(update),
        fullState: encodeUpdate(Y.encodeStateAsUpdate(ydoc)),
        origin: getClientId(),
        timestamp: Date.now(),
      });
      setSyncState('synced');
    } catch (error) {
      console.error('[Sync] Failed to push update:', error);
      setSyncState('offline');
    }
  });

  // Initial sync - push current state if remote is empty
  const snapshot = await import('firebase/firestore').then(m =>
    m.getDoc(syncDocRef)
  );

  if (!snapshot.exists()) {
    const fullState = Y.encodeStateAsUpdate(ydoc);
    await setDoc(syncDocRef, {
      update: encodeUpdate(fullState),
      fullState: encodeUpdate(fullState),
      origin: getClientId(),
      timestamp: Date.now(),
    });
  } else {
    // Apply remote state
    const data = snapshot.data();
    if (data.fullState) {
      try {
        const state = decodeUpdate(data.fullState);
        Y.applyUpdate(ydoc, state, 'firebase');
      } catch (error) {
        console.error('[Sync] Failed to apply initial state:', error);
      }
    }
  }
};

export const destroyFirebaseSync = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  setSyncState('offline');
};

let clientId: string | null = null;

const getClientId = (): string => {
  if (!clientId) {
    clientId = localStorage.getItem('sanjou-client-id');
    if (!clientId) {
      clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sanjou-client-id', clientId);
    }
  }
  return clientId;
};

// Reinitialize sync when auth state changes
let authUnsubscribe: (() => void) | null = null;

export const initAuthAwareSync = async (): Promise<void> => {
  // Clean up previous auth listener
  if (authUnsubscribe) {
    authUnsubscribe();
  }

  // Initial sync
  await initFirebaseSync();

  // Listen for auth changes and re-sync with new user's data
  authUnsubscribe = subscribeToAuthState(async (user) => {
    console.log('[Sync] Auth state changed:', user ? user.email : 'signed out');
    // Destroy current sync and reinitialize with new user's document
    destroyFirebaseSync();
    await initFirebaseSync();
  });
};

export const destroyAuthAwareSync = () => {
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  destroyFirebaseSync();
};
