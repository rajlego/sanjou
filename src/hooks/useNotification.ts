import { useCallback } from 'react';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { useSettingsStore } from '../store/settingsStore';

interface UseNotificationReturn {
  notify: (title: string, body?: string) => Promise<void>;
  notifyBlockComplete: () => Promise<void>;
  notifyBreakComplete: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

export const useNotification = (): UseNotificationReturn => {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  const notify = useCallback(async (title: string, body?: string) => {
    if (!notificationsEnabled) return;

    try {
      let permissionGranted = await isPermissionGranted();

      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        sendNotification({
          title,
          body,
        });
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }, [notificationsEnabled]);

  const notifyBlockComplete = useCallback(async () => {
    await notify('Block Complete!', 'Great work! Take a break or start another block.');
  }, [notify]);

  const notifyBreakComplete = useCallback(async () => {
    await notify('Break Over!', 'Ready to start your next focus block?');
  }, [notify]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      let permissionGranted = await isPermissionGranted();

      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      return permissionGranted;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }, []);

  return {
    notify,
    notifyBlockComplete,
    notifyBreakComplete,
    requestNotificationPermission,
  };
};
