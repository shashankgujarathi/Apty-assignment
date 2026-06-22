import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Mini Apty Overlay Error]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#1e293b',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          padding: '16px',
          color: '#f8fafc',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
          maxWidth: '350px',
          zIndex: 2147483647,
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle style={{ color: '#ef4444' }} size={20} />
            <strong style={{ fontSize: '14px' }}>Overlay Rendering Error</strong>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#cbd5e1' }}>
            {this.state.error?.message || 'An unexpected error occurred in the overlay UI.'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Overlay
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
