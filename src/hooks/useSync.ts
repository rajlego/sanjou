import { useEffect } from 'react';
import { initLocalPersistence, destroyLocalPersistence } from '../sync/yjsProvider';
import {
  initAuthAwareSync,
  destroyAuthAwareSync,
  subscribeSyncState,
} from '../sync/firebaseSync';
import { useUIStore } from '../store/uiStore';

export const useSync = () => {
  const setSyncState = useUIStore((s) => s.setSyncState);
  const setDataLoaded = useUIStore((s) => s.setDataLoaded);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // First, load local data from IndexedDB
      await initLocalPersistence();

      if (!mounted) return;
      setDataLoaded(true);

      // Then, setup Firebase sync with auth awareness
      await initAuthAwareSync();
    };

    // Subscribe to sync state changes
    const unsubscribe = subscribeSyncState((state) => {
      if (mounted) {
        setSyncState(state);
      }
    });

    init();

    return () => {
      mounted = false;
      unsubscribe();
      destroyAuthAwareSync();
      destroyLocalPersistence();
    };
  }, [setSyncState, setDataLoaded]);
};
