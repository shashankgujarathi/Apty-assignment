// Service Worker - Background Event Broker
import { isPathMatch } from '../utils/navigation.js';

const BACKEND_URL = 'http://localhost:3000';

interface ExtensionRecordingState {
  active: boolean;
  name: string;
  origin: string;
  path: string;
  steps: any[];
}

interface ExtensionPreviewState {
  active: boolean;
  walkthrough: any;
  currentStepIndex: number;
}

// Helper to get cached tokens or data
async function getStorageData(keys: string[]): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}

async function setStorageData(data: Record<string, any>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

// API request helper with token injection and normalized error categorizations
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const { token } = await getStorageData(['token']);
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.error('[Mini Apty SW] Fetch exception:', err);
    throw {
      type: 'network',
      message: 'Failed to connect to the backend server. Please verify the API is running at http://localhost:3000 and the database container is active.',
    };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData.error || `Request failed with status ${response.status}`;
    
    let type: 'auth' | 'validation' | 'unknown' = 'unknown';
    if (response.status === 401 || response.status === 403) {
      type = 'auth';
    } else if (response.status === 400 || response.status === 422) {
      type = 'validation';
    }

    throw {
      type,
      message: rawMessage,
    };
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Queue task to offline queue
async function queueOfflineAction(action: string, payload: any) {
  const { offlineQueue = [] } = await getStorageData(['offlineQueue']);
  offlineQueue.push({ action, payload, timestamp: Date.now() });
  await setStorageData({ offlineQueue });
  console.log('Action queued offline:', action, payload);
}

// Synchronize offline sync items
async function flushOfflineQueue() {
  const { offlineQueue = [] } = await getStorageData(['offlineQueue']);
  if (offlineQueue.length === 0) return;

  console.log(`Attempting to flush offline queue of ${offlineQueue.length} items...`);
  const remaining: any[] = [];

  for (const item of offlineQueue) {
    try {
      if (item.action === 'SAVE_WALKTHROUGH') {
        await apiFetch('/walkthroughs', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });
        console.log('Successfully synced walkthrough:', item.payload.name);
      }
      // If there are other actions (e.g. DELETE, UPDATE), we sync them here
    } catch (err) {
      console.error('Failed to sync offline item, keeping in queue:', err);
      remaining.push(item);
    }
  }

  await setStorageData({ offlineQueue: remaining });
}

// Setup periodic synchronization ping
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('sync-alarm', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync-alarm') {
    flushOfflineQueue().catch(console.error);
  }
});

function normalizeOrigin(origin: string): string {
  if (!origin) return '';
  return origin.toLowerCase().replace(/^https?:\/\/(www\.)?/, 'https://');
}

// Listener for tab updates to check if preview/record should carry over
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const origin = url.origin;

    // Retrieve storage states
    const { recordingState, previewState } = await getStorageData(['recordingState', 'previewState']);

    if (recordingState?.active && normalizeOrigin(recordingState.origin) === normalizeOrigin(origin)) {
      // Notify content script that recording is active on reload
      chrome.tabs.sendMessage(tabId, { action: 'RECORDING_RESUMED', payload: recordingState }).catch(() => {});
    }

    if (previewState?.active && normalizeOrigin(previewState.walkthrough.origin) === normalizeOrigin(origin)) {
      const steps = previewState.walkthrough.steps || [];
      const currentStep = steps[previewState.currentStepIndex];

      const currentPath = url.pathname + url.search + url.hash;

      if (currentStep && !isPathMatch(currentPath, currentStep.path)) {
        // Tab pathname has changed! Check if it matches the NEXT step's path
        const nextStepIndex = previewState.currentStepIndex + 1;
        const nextStep = steps[nextStepIndex];

        if (nextStep && isPathMatch(currentPath, nextStep.path)) {
          console.log(`[Service Worker] Tab navigated to next step path: ${currentPath}. Auto-advancing preview step to ${nextStepIndex + 1}`);
          previewState.currentStepIndex = nextStepIndex;
          await setStorageData({ previewState });
        }
      }

      // Notify content script to resume/display preview tooltip
      chrome.tabs.sendMessage(tabId, { action: 'PREVIEW_RESUMED', payload: previewState }).catch(() => {});
    }
  }
});

// Main Message Port Broker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.action) {
        case 'AUTH_SIGNUP': {
          const res = await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(message.payload),
          });
          await setStorageData({ token: res.token, user: res.user });
          flushOfflineQueue().catch(console.error); // Attempt sync after login
          return { success: true, user: res.user };
        }

        case 'AUTH_LOGIN': {
          const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify(message.payload),
          });
          await setStorageData({ token: res.token, user: res.user });
          flushOfflineQueue().catch(console.error); // Attempt sync after login
          return { success: true, user: res.user };
        }

        case 'AUTH_LOGOUT': {
          await setStorageData({ token: null, user: null });
          return { success: true };
        }

        case 'GET_USER': {
          const { user, token } = await getStorageData(['user', 'token']);
          return { success: true, user, authenticated: !!token };
        }

        case 'GET_WALKTHROUGHS': {
          const { origin, path } = message.payload;
          const cacheKey = path ? `cache:${origin}:${path}` : `cache:${origin}`;
          const params = new URLSearchParams();
          if (origin) params.append('origin', origin);
          if (path) params.append('path', path);
          try {
            const data = await apiFetch(`/walkthroughs?${params.toString()}`);
            // Cache locally
            await setStorageData({ [cacheKey]: data });
            return { success: true, data };
          } catch (err) {
            console.warn('Network query failed. Retrieving local cached storage walkthroughs.', err);
            const cached = await getStorageData([cacheKey]);
            return { success: true, data: cached[cacheKey] || [], cached: true };
          }
        }

        case 'START_RECORDING': {
          const { name, origin, path } = message.payload;
          const recordingState: ExtensionRecordingState = {
            active: true,
            name,
            origin,
            path,
            steps: [],
          };
          await setStorageData({ recordingState });
          
          // Notify active tab to trigger recording overlay
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'RECORDING_STARTED', payload: recordingState }).catch(() => {});
          }
          return { success: true };
        }

        case 'ADD_RECORDED_STEP': {
          const { recordingState } = await getStorageData(['recordingState']);
          if (!recordingState || !recordingState.active) {
            throw new Error('No active recording session');
          }
          const step = message.payload;
          recordingState.steps.push(step);
          await setStorageData({ recordingState });

          // Broadcast update back to page to update floating controls step count
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'RECORDING_UPDATED', payload: recordingState }).catch(() => {});
          }
          return { success: true, recordingState };
        }

        case 'SAVE_WALKTHROUGH': {
          const { recordingState } = await getStorageData(['recordingState']);
          if (!recordingState || !recordingState.active) {
            throw new Error('No active recording session to save');
          }

          // Build payload
          const payload = {
            name: recordingState.name,
            origin: recordingState.origin,
            path: recordingState.path,
            steps: recordingState.steps,
            isActive: true,
          };

          // Clear recording state
          await setStorageData({ recordingState: null });

          // Notify content script recording has ended
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'RECORDING_ENDED' }).catch(() => {});
          }

          try {
            const res = await apiFetch('/walkthroughs', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            return { success: true, data: res };
          } catch (err) {
            console.warn('Network issue saving walkthrough, queueing locally', err);
            await queueOfflineAction('SAVE_WALKTHROUGH', payload);
            return { success: true, offline: true };
          }
        }

        case 'CANCEL_RECORDING': {
          await setStorageData({ recordingState: null });
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'RECORDING_ENDED' }).catch(() => {});
          }
          return { success: true };
        }

        case 'START_PREVIEW': {
          const { walkthrough } = message.payload;
          const previewState: ExtensionPreviewState = {
            active: true,
            walkthrough,
            currentStepIndex: 0,
          };
          await setStorageData({ previewState });

          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'PREVIEW_STARTED', payload: previewState }).catch(() => {});
          }
          return { success: true };
        }

        case 'PREVIEW_STEP_NAVIGATE': {
          const { currentStepIndex } = message.payload;
          const { previewState } = await getStorageData(['previewState']);
          if (!previewState) throw new Error('No preview session active');

          previewState.currentStepIndex = currentStepIndex;
          await setStorageData({ previewState });

          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'PREVIEW_UPDATED', payload: previewState }).catch(() => {});
          }
          return { success: true };
        }

        case 'END_PREVIEW': {
          await setStorageData({ previewState: null });
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'PREVIEW_ENDED' }).catch(() => {});
          }
          return { success: true };
        }

        default:
          return { error: 'Unknown message action' };
      }
    } catch (err: any) {
      console.error(`Error processing action ${message.action}:`, err);
      const normalized = err && typeof err === 'object' && err.type && err.message 
        ? err 
        : { type: 'unknown', message: err.message || 'An unexpected error occurred processing the request' };
      return { success: false, error: normalized };
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep message channel open for async sendResponse
});
