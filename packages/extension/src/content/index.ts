import { startRecording, stopRecording, updateRecordingState } from './detector/recorder.js';
import { startPreview, stopPreview, updatePreviewState } from './preview/index.js';

console.log('[Mini Apty] Content script loaded and active.');

function normalizeOrigin(origin: string): string {
  if (!origin) return '';
  return origin.toLowerCase().replace(/^https?:\/\/(www\.)?/, 'https://');
}

// Auto-resume active preview/recording sessions from chrome storage on script mount (page refresh)
function checkAndResume() {
  chrome.storage.local.get(['recordingState', 'previewState'], (res) => {
    try {
      const currentUrl = new URL(window.location.href);
      const currentOrigin = currentUrl.origin;

      // Auto-resume recording
      if (res.recordingState?.active) {
        if (normalizeOrigin(res.recordingState.origin) === normalizeOrigin(currentOrigin)) {
          console.log('[Mini Apty] Auto-resuming active recording session:', res.recordingState.name);
          startRecording(res.recordingState);
        }
      } else {
        stopRecording();
      }

      // Auto-resume preview
      if (res.previewState?.active) {
        if (normalizeOrigin(res.previewState.walkthrough.origin) === normalizeOrigin(currentOrigin)) {
          console.log('[Mini Apty] Auto-resuming active preview walkthrough:', res.previewState.walkthrough.name);
          startPreview(res.previewState, true); // True indicating initial page load
        }
      } else {
        stopPreview();
      }
    } catch (err) {
      console.error('[Mini Apty] Error auto-resuming sessions:', err);
    }
  });
}

checkAndResume();

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log('[Mini Apty] Page restored from back-forward cache. Rechecking state.');
    checkAndResume();
  }
});

// Listen to service worker commands
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Mini Apty] Received runtime message:', message.action, message.payload);

  try {
    switch (message.action) {
      case 'RECORDING_STARTED':
      case 'RECORDING_RESUMED':
        startRecording(message.payload);
        break;

      case 'RECORDING_UPDATED':
        updateRecordingState(message.payload);
        break;

      case 'RECORDING_ENDED':
        stopRecording();
        break;

      case 'PREVIEW_STARTED':
      case 'PREVIEW_RESUMED':
        startPreview(message.payload);
        break;

      case 'PREVIEW_UPDATED':
        updatePreviewState(message.payload);
        break;

      case 'PREVIEW_ENDED':
        stopPreview();
        break;
    }
  } catch (err) {
    console.error('[Mini Apty] Error handling message:', err);
  }

  sendResponse({ received: true });
  return false;
});
