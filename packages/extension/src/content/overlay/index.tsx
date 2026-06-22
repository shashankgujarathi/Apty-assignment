import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayComponent from './OverlayComponent.js';
import { ErrorBoundary } from './ErrorBoundary.js';
export type { ElementBounds } from './OverlayComponent.js';
// @ts-ignore
import cssText from './overlay.css?inline';

let container: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let reactRoot: ReactDOM.Root | null = null;
let bodyObserver: MutationObserver | null = null;

const DEFAULT_PROPS = {
  recordingActive: false,
  recordingName: '',
  stepCount: 0,
  hoveredBounds: null,
  selectedBounds: null,
  recordingMode: 'capture' as const,
  previewActive: false,
  currentStepIndex: 0,
  previewWalkthrough: null,
  previewTargetBounds: null,
  pathMismatch: false,
};

let currentProps: any = { ...DEFAULT_PROPS };

export function setupOverlay(actions: {
  onAddStep: (title: string, description: string, triggerType: string, triggerValue?: string) => void;
  onCancelStepSelection: () => void;
  onSaveWalkthrough: () => void;
  onCancelRecording: () => void;
  onNavigatePreview: (newIndex: number) => void;
  onClosePreview: () => void;
  onChangeRecordingMode?: (mode: 'capture' | 'interact') => void;
}) {
  if (container) {
    if (!container.isConnected && document.body) {
      document.body.appendChild(container);
    }
    return;
  }

  if (!document.body) {
    window.addEventListener('DOMContentLoaded', () => setupOverlay(actions));
    return;
  }

  // Create custom container tag to prevent class leakage
  container = document.createElement('mini-apty-root');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none'; // Ensure clicks pass through to host page unless hovering modal/bar
  container.style.zIndex = '2147483647';
  document.body.appendChild(container);

  // Set up observer to re-append if host page PJAX destroys/unmounts container
  bodyObserver = new MutationObserver(() => {
    if (container && !container.isConnected && document.body) {
      console.log('[Mini Apty] Overlay container detached from DOM. Re-appending...');
      bodyObserver?.disconnect();
      document.body.appendChild(container);
      bodyObserver?.observe(document.body, { childList: true });
    }
  });
  bodyObserver.observe(document.body, { childList: true });

  shadowRoot = container.attachShadow({ mode: 'open' });

  // Create isolated stylesheet wrapper
  const styleEl = document.createElement('style');
  styleEl.textContent = cssText;
  shadowRoot.appendChild(styleEl);

  // Mount point
  const mount = document.createElement('div');
  mount.className = 'apty-root-mount';
  // Restore pointer-events inside the container content itself (modals, tooltips, cards)
  mount.style.pointerEvents = 'auto';
  shadowRoot.appendChild(mount);

  reactRoot = ReactDOM.createRoot(mount);
  render(actions);
}

function render(actions: any) {
  if (!reactRoot) return;
  reactRoot.render(
    <React.StrictMode>
      <ErrorBoundary>
        <OverlayComponent {...currentProps} {...actions} />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

export function updateOverlay(newProps: Partial<typeof currentProps>, actions: any) {
  currentProps = { ...currentProps, ...newProps };
  render(actions);
}

export function destroyOverlay() {
  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (container) {
    container.remove();
    container = null;
    shadowRoot = null;
  }
  currentProps = { ...DEFAULT_PROPS };
}
