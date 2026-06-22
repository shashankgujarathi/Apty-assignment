import { generateSelectors } from './generator.js';
import { setupOverlay, updateOverlay, destroyOverlay, ElementBounds } from '../overlay/index.js';

let isRecordingActive = false;
let currentRecordingName = '';
let currentStepList: any[] = [];
let hoveredElement: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;
let recordingMode: 'capture' | 'interact' = 'capture';

// Event listener references
const mouseMoveHandler = (e: MouseEvent) => {
  if (!isRecordingActive || recordingMode === 'interact' || selectedElement) return;

  const target = e.target as HTMLElement;
  if (!target) return;

  // Ignore hover if inside extension UI
  if (target.tagName.startsWith('MINI-APTY') || target.closest('mini-apty-root')) {
    updateOverlay({ hoveredBounds: null }, overlayActions);
    hoveredElement = null;
    return;
  }

  if (target === hoveredElement) return;
  hoveredElement = target;

  const rect = target.getBoundingClientRect();
  const bounds: ElementBounds = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };

  updateOverlay({ hoveredBounds: bounds }, overlayActions);
};

const clickHandler = (e: MouseEvent) => {
  if (!isRecordingActive) return;

  const target = e.target as HTMLElement;
  if (!target) return;

  // Let overlay interface button clicks run naturally
  if (target.tagName.startsWith('MINI-APTY') || target.closest('mini-apty-root')) {
    return;
  }

  if (recordingMode === 'interact') {
    return; // Let clicks pass through naturally to interact with/navigate host page
  }

  // Intercept normal host clicks while in config modal
  e.preventDefault();
  e.stopPropagation();

  if (selectedElement) return; // Wait for active modal configure

  selectedElement = target;
  hoveredElement = null;

  const rect = target.getBoundingClientRect();
  const bounds: ElementBounds = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };

  updateOverlay({
    hoveredBounds: null,
    selectedBounds: bounds,
  }, overlayActions);
};

// Scroll and resize listeners to adjust highlights
const scrollResizeHandler = () => {
  if (!isRecordingActive) return;

  if (selectedElement) {
    const rect = selectedElement.getBoundingClientRect();
    updateOverlay({
      selectedBounds: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }, overlayActions);
  }
};

const overlayActions = {
  onAddStep: async (title: string, description: string, triggerType: string, triggerValue?: string) => {
    if (!selectedElement) return;

    try {
      const selectors = generateSelectors(selectedElement);
      const stepNumber = currentStepList.length + 1;

      const newStep = {
        stepNumber,
        title,
        description,
        selectors,
        triggerType,
        triggerValue,
        path: window.location.pathname + window.location.search + window.location.hash,
      };

      // Send to background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'ADD_RECORDED_STEP',
        payload: newStep,
      });

      if (response && response.success) {
        currentStepList = response.recordingState.steps;

        // Reset selections
        selectedElement = null;
        updateOverlay({
          selectedBounds: null,
          stepCount: currentStepList.length,
        }, overlayActions);
      } else {
        alert('Failed to save step: ' + (response?.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saving step: ' + err.message);
    }
  },

  onCancelStepSelection: () => {
    selectedElement = null;
    updateOverlay({ selectedBounds: null }, overlayActions);
  },

  onSaveWalkthrough: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'SAVE_WALKTHROUGH' });
      if (response && response.success) {
        stopRecording();
      } else {
        alert('Error saving walkthrough: ' + (response?.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert(err.message);
    }
  },

  onCancelRecording: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'CANCEL_RECORDING' });
      if (response && response.success) {
        stopRecording();
      }
    } catch (err: any) {
      console.error(err);
    }
  },

  onChangeRecordingMode: (mode: 'capture' | 'interact') => {
    recordingMode = mode;
    hoveredElement = null;
    selectedElement = null;
    updateOverlay({
      recordingMode,
      hoveredBounds: null,
      selectedBounds: null,
    }, overlayActions);
  },

  // Stub previews inside recorder
  onNavigatePreview: () => { },
  onClosePreview: () => { },
};

export function startRecording(state: { name: string; steps: any[] }) {
  if (isRecordingActive) {
    setupOverlay(overlayActions);
    updateOverlay({
      recordingActive: true,
      recordingName: currentRecordingName,
      stepCount: currentStepList.length,
      recordingMode,
    }, overlayActions);
    return;
  }

  isRecordingActive = true;
  currentRecordingName = state.name;
  currentStepList = state.steps;
  selectedElement = null;
  hoveredElement = null;
  recordingMode = 'capture';

  setupOverlay(overlayActions);
  updateOverlay({
    recordingActive: true,
    recordingName: currentRecordingName,
    stepCount: currentStepList.length,
    recordingMode,
  }, overlayActions);

  // Bind intercept events
  window.addEventListener('mousemove', mouseMoveHandler, true);
  window.addEventListener('click', clickHandler, true);
  window.addEventListener('scroll', scrollResizeHandler, { passive: true });
  window.addEventListener('resize', scrollResizeHandler, { passive: true });
}

export function stopRecording() {
  if (!isRecordingActive) return;

  isRecordingActive = false;
  selectedElement = null;
  hoveredElement = null;

  window.removeEventListener('mousemove', mouseMoveHandler, true);
  window.removeEventListener('click', clickHandler, true);
  window.removeEventListener('scroll', scrollResizeHandler);
  window.removeEventListener('resize', scrollResizeHandler);

  destroyOverlay();
}

export function updateRecordingState(state: { steps: any[] }) {
  if (!isRecordingActive) return;
  currentStepList = state.steps;
  updateOverlay({ stepCount: currentStepList.length }, overlayActions);
}
