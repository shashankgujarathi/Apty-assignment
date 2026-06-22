import { findBestTargetElement } from "./scorer.js";
import {
  setupOverlay,
  updateOverlay,
  destroyOverlay,
  ElementBounds,
} from "../overlay/index.js";
import { isPathMatch } from "../../utils/navigation.js";

let isPreviewActive = false;
let previewWalkthrough: any = null;
let currentStepIndex = 0;
let targetElement: HTMLElement | null = null;
let mutationObserver: MutationObserver | null = null;
let targetObserver: MutationObserver | null = null;

let currentTriggerCleanup: (() => void) | null = null;

function findAndAnchor(isInitialLoad: boolean = false) {
  if (!isPreviewActive || !previewWalkthrough) return;

  const steps = previewWalkthrough.steps || [];
  const currentStep = steps[currentStepIndex];
  if (!currentStep) return;

  if (currentStep.path) {
    const currentPath =
      window.location.pathname + window.location.search + window.location.hash;
    if (!isPathMatch(currentPath, currentStep.path)) {
      let foundMatchingIndex = -1;
      if (isInitialLoad) {
        for (let i = currentStepIndex + 1; i < steps.length; i++) {
          if (steps[i].path && isPathMatch(currentPath, steps[i].path)) {
            foundMatchingIndex = i;
            break;
          }
        }
      }

      if (foundMatchingIndex !== -1) {
        console.log(
          `[Mini Apty] Path mismatch but found matching subsequent step at index ${foundMatchingIndex}. Auto-advancing preview index.`,
        );
        overlayActions.onNavigatePreview(foundMatchingIndex);
        return;
      } else {
        console.log(
          `[Mini Apty] Step ${currentStepIndex + 1} path mismatch (current: ${currentPath}, step: ${currentStep.path}). Prompting for redirect...`,
        );
        cleanupStepTracking();
        updateOverlay(
          {
            previewTargetBounds: null,
            pathMismatch: true,
          },
          overlayActions,
        );
        return;
      }
    }
  }

  cleanupStepTracking();

  const element = findBestTargetElement(currentStep.selectors);

  if (element) {
    targetElement = element;
    console.log(
      `Element found! Anchoring step ${currentStepIndex + 1} onto`,
      element,
    );

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    updateTargetOverlayBounds();

    window.addEventListener("scroll", handlePositionUpdate, { passive: true });
    window.addEventListener("resize", handlePositionUpdate, { passive: true });

    setupTargetObserver(element);

    setupStepTrigger(element, currentStep);
  } else {
    console.log(
      `Target element not found in DOM for step ${currentStepIndex + 1}. Watching for mutations...`,
    );
    updateOverlay({ previewTargetBounds: null }, overlayActions);
    setupMutationObserver();
  }
}

function handlePositionUpdate() {
  if (!targetElement) return;
  updateTargetOverlayBounds();
}

function updateTargetOverlayBounds() {
  if (!targetElement) return;
  const rect = targetElement.getBoundingClientRect();
  const bounds: ElementBounds = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
  updateOverlay({ previewTargetBounds: bounds }, overlayActions);
}

function setupMutationObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver(() => {
    const steps = previewWalkthrough.steps || [];
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    const element = findBestTargetElement(currentStep.selectors);
    if (element) {
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      findAndAnchor();
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function setupTargetObserver(element: HTMLElement) {
  if (targetObserver) {
    targetObserver.disconnect();
  }

  targetObserver = new MutationObserver(() => {
    if (!document.body.contains(element)) {
      console.warn("Target element detached from DOM. Re-searching...");
      cleanupStepTracking();
      findAndAnchor();
    }
  });

  if (element.parentNode) {
    targetObserver.observe(element.parentNode, { childList: true });
  }
}

function setupStepTrigger(element: HTMLElement, step: any) {
  const triggerType = step.triggerType;

  if (triggerType === "click-target") {
    const clickListener = () => {
      console.log("Target element clicked! Advancing walkthrough...");
      setTimeout(() => {
        overlayActions.onNavigatePreview(currentStepIndex + 1);
      }, 100);
    };

    element.addEventListener("click", clickListener, true);
    currentTriggerCleanup = () => {
      element.removeEventListener("click", clickListener, true);
    };
  } else if (triggerType === "input-change") {
    const inputListener = (e: Event) => {
      const inputEl = e.target as HTMLInputElement;
      if (!inputEl) return;

      const currentVal = inputEl.value;
      const targetVal = step.triggerValue;

      if (targetVal) {
        if (currentVal.toLowerCase() === targetVal.toLowerCase()) {
          console.log(
            `Input value matches target "${targetVal}". Advancing walkthrough...`,
          );
          overlayActions.onNavigatePreview(currentStepIndex + 1);
        }
      } else if (currentVal.trim().length > 0) {
        triggerInputChangeAdvance();
      }
    };

    let inputTimeout: any = null;
    const triggerInputChangeAdvance = () => {
      if (inputTimeout) clearTimeout(inputTimeout);
      inputTimeout = setTimeout(() => {
        console.log("Input changed! Advancing walkthrough...");
        overlayActions.onNavigatePreview(currentStepIndex + 1);
      }, 800);
    };

    element.addEventListener("input", inputListener, true);
    currentTriggerCleanup = () => {
      if (inputTimeout) clearTimeout(inputTimeout);
      element.removeEventListener("input", inputListener, true);
    };
  }
}

function cleanupStepTracking() {
  window.removeEventListener("scroll", handlePositionUpdate);
  window.removeEventListener("resize", handlePositionUpdate);

  if (targetObserver) {
    targetObserver.disconnect();
    targetObserver = null;
  }

  if (currentTriggerCleanup) {
    currentTriggerCleanup();
    currentTriggerCleanup = null;
  }

  targetElement = null;
}

const overlayActions = {
  onNavigatePreview: async (newIndex: number) => {
    const steps = previewWalkthrough.steps || [];
    if (newIndex < 0 || newIndex >= steps.length) {
      overlayActions.onClosePreview();
      return;
    }

    currentStepIndex = newIndex;
    const targetStep = steps[newIndex];

    await chrome.runtime.sendMessage({
      action: "PREVIEW_STEP_NAVIGATE",
      payload: { currentStepIndex: newIndex },
    });

    updateOverlay(
      {
        currentStepIndex,
        pathMismatch: false,
        previewTargetBounds: null,
      },
      overlayActions,
    );

    if (targetStep && targetStep.path) {
      const currentPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      if (!isPathMatch(currentPath, targetStep.path)) {
        console.log(
          `[Mini Apty] Explicit preview navigation path change. Redirecting to ${targetStep.path}`,
        );
        window.location.href = window.location.origin + targetStep.path;
        return;
      }
    }

    findAndAnchor();
  },

  onClosePreview: async () => {
    await chrome.runtime.sendMessage({ action: "END_PREVIEW" });
    stopPreview();
  },

  onAddStep: () => {},
  onCancelStepSelection: () => {},
  onSaveWalkthrough: () => {},
  onCancelRecording: () => {},
};

export function startPreview(
  state: { walkthrough: any; currentStepIndex: number },
  isInitialLoad: boolean = false,
) {
  if (isPreviewActive) {
    stopPreview();
  }

  isPreviewActive = true;
  previewWalkthrough = state.walkthrough;
  currentStepIndex = state.currentStepIndex;

  setupOverlay(overlayActions);
  updateOverlay(
    {
      previewActive: true,
      currentStepIndex,
      previewWalkthrough,
    },
    overlayActions,
  );

  findAndAnchor(isInitialLoad);
}

export function updatePreviewState(state: { currentStepIndex: number }) {
  if (!isPreviewActive) return;
  currentStepIndex = state.currentStepIndex;
  updateOverlay(
    { currentStepIndex, previewTargetBounds: null },
    overlayActions,
  );
  findAndAnchor();
}

export function stopPreview() {
  if (!isPreviewActive) return;

  isPreviewActive = false;
  previewWalkthrough = null;
  currentStepIndex = 0;

  cleanupStepTracking();

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  destroyOverlay();
}
