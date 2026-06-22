import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  AlertTriangle
} from 'lucide-react';

export interface ElementBounds {
  top: number;    // viewport-relative (getBoundingClientRect().top)
  left: number;   // viewport-relative
  width: number;
  height: number;
}

interface OverlayComponentProps {
  // Recording States
  recordingActive: boolean;
  recordingName: string;
  stepCount: number;
  hoveredBounds: ElementBounds | null;
  selectedBounds: ElementBounds | null;
  recordingMode: 'capture' | 'interact';

  // Preview States
  previewActive: boolean;
  currentStepIndex: number;
  previewWalkthrough: any;
  previewTargetBounds: ElementBounds | null;
  pathMismatch?: boolean;

  // Actions
  onAddStep: (title: string, description: string, triggerType: string, triggerValue?: string) => void;
  onCancelStepSelection: () => void;
  onSaveWalkthrough: () => void;
  onCancelRecording: () => void;
  onNavigatePreview: (newIndex: number) => void;
  onClosePreview: () => void;
  onChangeRecordingMode?: (mode: 'capture' | 'interact') => void;
}

export default function OverlayComponent({
  recordingActive,
  recordingName,
  stepCount,
  hoveredBounds,
  selectedBounds,
  recordingMode,
  previewActive,
  currentStepIndex,
  previewWalkthrough,
  previewTargetBounds,
  pathMismatch,
  onAddStep,
  onCancelStepSelection,
  onSaveWalkthrough,
  onCancelRecording,
  onNavigatePreview,
  onClosePreview,
  onChangeRecordingMode,
}: OverlayComponentProps) {
  // Step Builder Form states
  const [stepTitle, setStepTitle] = useState('');
  const [stepDesc, setStepDesc] = useState('');
  const [stepTrigger, setStepTrigger] = useState('next-button');
  const [stepTriggerVal, setStepTriggerVal] = useState('');

  useEffect(() => {
    if (selectedBounds) {
      setStepTitle(`Step ${stepCount + 1}`);
      setStepDesc('');
      setStepTrigger('next-button');
      setStepTriggerVal('');
    }
  }, [selectedBounds]);

  const handleStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepTitle.trim()) return;
    onAddStep(stepTitle, stepDesc, stepTrigger, stepTriggerVal || undefined);
  };

  // Compute Tooltip absolute style
  const getTooltipStyle = (): React.CSSProperties => {
    if (!previewTargetBounds) return { display: 'none' };

    const { top, left, height } = previewTargetBounds;
    const padding = 12;

    // Tooltip size is 300px
    const tooltipWidth = 300;

    // Default: position tooltip below the element
    let tooltipTop = top + height + padding;
    let tooltipLeft = left;

    // Check bounds: if elements is too close to bottom of screen, show above
    const viewportHeight = window.innerHeight;
    if (tooltipTop + 180 > viewportHeight) {
      tooltipTop = top - 180 - padding; // Approximate tooltip height
    }

    // Check bounds: if too far right, align to right side of target
    const viewportWidth = window.innerWidth;
    if (tooltipLeft + tooltipWidth > viewportWidth) {
      tooltipLeft = Math.max(10, viewportWidth - tooltipWidth - 20);
    }

    return {
      position: 'fixed',
      top: `${Math.max(10, tooltipTop)}px`,
      left: `${Math.max(10, tooltipLeft)}px`,
      width: `${tooltipWidth}px`,
    };
  };

  return (
    <div className="apty-overlay-root">
      {/* 1. HOVER HIGHLIGHT (Recording mode) */}
      {recordingActive && hoveredBounds && !selectedBounds && (
        <div
          className="apty-element-highlight"
          style={{
            position: 'fixed',
            top: `${hoveredBounds.top}px`,
            left: `${hoveredBounds.left}px`,
            width: `${hoveredBounds.width}px`,
            height: `${hoveredBounds.height}px`,
          }}
        />
      )}

      {/* 2. SELECTED TARGET ELEMENT HIGHLIGHT (Recording mode & Preview mode) */}
      {recordingActive && selectedBounds && (
        <div
          className="apty-element-selected"
          style={{
            position: 'fixed',
            top: `${selectedBounds.top}px`,
            left: `${selectedBounds.left}px`,
            width: `${selectedBounds.width}px`,
            height: `${selectedBounds.height}px`,
          }}
        />
      )}

      {previewActive && previewTargetBounds && (
        <div
          className="apty-element-selected"
          style={{
            position: 'fixed',
            top: `${previewTargetBounds.top}px`,
            left: `${previewTargetBounds.left}px`,
            width: `${previewTargetBounds.width}px`,
            height: `${previewTargetBounds.height}px`,
          }}
        />
      )}

      {/* 3. FLOATING RECORD CONTROL BAR */}
      {recordingActive && (
        <div className="apty-control-bar">
          <div className="apty-control-info">
            <div className="apty-rec-indicator" style={{ backgroundColor: recordingMode === 'interact' ? '#f59e0b' : '#ef4444' }} />
            <div>
              <span style={{ fontWeight: 700, fontSize: '12px', color: recordingMode === 'interact' ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>
                {recordingMode === 'interact' ? 'Interact' : 'Capture'}
              </span>
              <span style={{ margin: '0 8px', color: '#2e3d60' }}>|</span>
              <strong style={{ color: '#f8fafc', fontSize: '13px' }}>{recordingName}</strong>
              <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '6px' }}>({stepCount} steps)</span>
            </div>
          </div>
          <div className="apty-btn-group">
            {recordingMode === 'interact' ? (
              <button
                type="button"
                onClick={() => onChangeRecordingMode?.('capture')}
                className="apty-btn apty-btn-warning apty-btn-sm"
                title="Switch back to capture elements"
              >
                Capture Mode
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onChangeRecordingMode?.('interact')}
                className="apty-btn apty-btn-secondary apty-btn-sm"
                title="Switch to navigate/click links on host page"
              >
                Navigate Mode
              </button>
            )}
            <button onClick={onSaveWalkthrough} className="apty-btn apty-btn-primary apty-btn-sm" disabled={stepCount === 0}>
              Save Guide
            </button>
            <button onClick={onCancelRecording} className="apty-btn apty-btn-secondary apty-btn-sm">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* 4. STEP BUILDER MODAL */}
      {recordingActive && selectedBounds && (
        <div className="apty-modal-overlay">
          <form onSubmit={handleStepSubmit} className="apty-modal-content">
            <div className="apty-modal-title">
              <Plus size={18} style={{ color: '#6366f1' }} />
              Configure Walkthrough Step {stepCount + 1}
            </div>

            <div className="apty-form-group">
              <label>Step Title</label>
              <input
                type="text"
                className="apty-input"
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                placeholder="e.g. Click the profile button"
                required
              />
            </div>

            <div className="apty-form-group">
              <label>Instructions / Description</label>
              <textarea
                className="apty-textarea"
                rows={3}
                value={stepDesc}
                onChange={(e) => setStepDesc(e.target.value)}
                placeholder="Explain what the user needs to do in this step..."
              />
            </div>

            <div className="apty-form-group">
              <label>Advance Trigger</label>
              <select
                className="apty-select"
                value={stepTrigger}
                onChange={(e) => setStepTrigger(e.target.value)}
              >
                <option value="next-button">Manual "Next" button click</option>
                <option value="click-target">Clicking the targeted element</option>
                <option value="input-change">Changing value of the input</option>
              </select>
            </div>

            {stepTrigger === 'input-change' && (
              <div className="apty-form-group">
                <label>Expected Target Value (Optional)</label>
                <input
                  type="text"
                  className="apty-input"
                  value={stepTriggerVal}
                  onChange={(e) => setStepTriggerVal(e.target.value)}
                  placeholder="Trigger next step when text matches this..."
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onCancelStepSelection} className="apty-btn apty-btn-secondary">
                Cancel
              </button>
              <button type="submit" className="apty-btn apty-btn-primary">
                Add Step
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. PREVIEW TOOLTIP CARD */}
      {previewActive && previewWalkthrough && previewTargetBounds && (
        (() => {
          const steps = previewWalkthrough.steps || [];
          const currentStep = steps[currentStepIndex];
          if (!currentStep) return null;

          return (
            <div className="apty-tooltip-card animate-fade-in" style={getTooltipStyle()}>
              <div className="apty-tooltip-header">
                <span className="apty-step-badge">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <button onClick={onClosePreview} className="apty-close-btn" title="End walkthrough">
                  <X size={16} />
                </button>
              </div>

              <h4 className="apty-tooltip-title">{currentStep.title}</h4>
              <p className="apty-tooltip-description">{currentStep.description}</p>

              <div className="apty-tooltip-footer">
                <span className="apty-trigger-info">
                  {currentStep.triggerType === 'next-button' && 'Manual next'}
                  {currentStep.triggerType === 'click-target' && 'Trigger: Click element'}
                  {currentStep.triggerType === 'input-change' && 'Trigger: Input change'}
                </span>

                <div className="apty-btn-group">
                  <button
                    onClick={() => onNavigatePreview(currentStepIndex - 1)}
                    className="apty-btn apty-btn-secondary apty-btn-sm"
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft size={14} /> Back
                  </button>

                  {currentStepIndex < steps.length - 1 ? (
                    <button
                      onClick={() => onNavigatePreview(currentStepIndex + 1)}
                      className="apty-btn apty-btn-primary apty-btn-sm"
                      disabled={currentStep.triggerType !== 'next-button'}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={onClosePreview}
                      className="apty-btn apty-btn-primary apty-btn-sm"
                    >
                      Finish <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* 6. PATH MISMATCH REDIRECT PROMPT */}
      {previewActive && pathMismatch && (
        (() => {
          const steps = previewWalkthrough.steps || [];
          const currentStep = steps[currentStepIndex];
          if (!currentStep) return null;

          return (
            <div className="apty-modal-overlay">
              <div className="apty-modal-content" style={{ width: '340px', textAlign: 'center' }}>
                <AlertTriangle size={36} style={{ color: '#f59e0b', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>Active Step is on Another Page</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#cbd5e1' }}>
                  Step {currentStepIndex + 1} takes place on <code>{currentStep.path}</code>.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = window.location.origin + currentStep.path;
                    }}
                    className="apty-btn apty-btn-primary"
                    style={{ width: '100%' }}
                  >
                    Go to Page
                  </button>
                  <button
                    type="button"
                    onClick={onClosePreview}
                    className="apty-btn apty-btn-secondary"
                  >
                    Exit
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
