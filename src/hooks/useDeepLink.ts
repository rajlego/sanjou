import { useEffect, useCallback } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

interface DeepLinkData {
  task?: string;
  taskId?: string;
  rightNow?: string;
}

export const useDeepLink = (onReceive: (data: DeepLinkData) => void) => {
  const handleUrl = useCallback((urls: string[]) => {
    for (const url of urls) {
      try {
        // Parse sanjou://start?task=...&rightNow=...
        const parsed = new URL(url);

        if (parsed.protocol === 'sanjou:') {
          const task = parsed.searchParams.get('task');
          const taskId = parsed.searchParams.get('taskId');
          const rightNow = parsed.searchParams.get('rightNow');

          onReceive({
            task: task || undefined,
            taskId: taskId || undefined,
            rightNow: rightNow || undefined,
          });
        }
      } catch (e) {
        console.error('Failed to parse deep link URL:', url, e);
      }
    }
  }, [onReceive]);

  useEffect(() => {
    // Listen for deep links
    let unlisten: (() => void) | undefined;

    onOpenUrl(handleUrl).then((fn) => {
      unlisten = fn;
    }).catch((e) => {
      // Deep link not available (dev mode or not configured)
      console.log('Deep link not available:', e);
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleUrl]);
};
