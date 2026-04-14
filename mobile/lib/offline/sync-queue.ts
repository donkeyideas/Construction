import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiCall } from '../supabase';

const QUEUE_KEY = '@buildwrk:offline-queue';

export interface QueuedAction {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: string;
  createdAt: string;
  retries: number;
}

/**
 * Add an action to the offline queue.
 * Called when a mutation fails due to network issues.
 */
export async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const queue = await getQueue();
  const entry: QueuedAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Get all queued actions.
 */
export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Get count of pending actions.
 */
export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Process all queued actions. Called when connectivity is restored.
 * Returns number of successfully synced items.
 */
export async function processQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    const { error } = await apiCall(action.endpoint, {
      method: action.method,
      body: action.body,
    });

    if (error) {
      // Keep in queue if it fails, increment retries
      if (action.retries < 5) {
        remaining.push({ ...action, retries: action.retries + 1 });
      }
      // Drop after 5 retries
    } else {
      synced++;
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return synced;
}

/**
 * Clear the entire queue (e.g. on sign-out).
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Start listening for connectivity changes.
 * Auto-syncs when connectivity is restored.
 * Returns cleanup function.
 */
export function startSyncListener(
  onSync?: (count: number) => void
): () => void {
  let wasOffline = false;

  const unsubscribe = NetInfo.addEventListener(async (state) => {
    const isOnline = state.isConnected && state.isInternetReachable !== false;

    if (isOnline && wasOffline) {
      // Just came back online — process queue
      const synced = await processQueue();
      if (synced > 0 && onSync) {
        onSync(synced);
      }
    }

    wasOffline = !isOnline;
  });

  return unsubscribe;
}

/**
 * Wrapper for apiCall that automatically queues on network failure.
 * Use this for mutations that should work offline.
 */
export async function offlineApiCall(
  endpoint: string,
  options: RequestInit & { method: 'POST' | 'PATCH' | 'DELETE' }
): Promise<{ data: any; error: string | null; queued: boolean }> {
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected && netState.isInternetReachable !== false;

  if (!isOnline) {
    await enqueue({
      endpoint,
      method: options.method,
      body: (options.body as string) ?? '{}',
    });
    return { data: null, error: null, queued: true };
  }

  const result = await apiCall(endpoint, options);

  if (result.error && result.error.includes('Network')) {
    // Network error — queue it
    await enqueue({
      endpoint,
      method: options.method,
      body: (options.body as string) ?? '{}',
    });
    return { data: null, error: null, queued: true };
  }

  return { ...result, queued: false };
}
