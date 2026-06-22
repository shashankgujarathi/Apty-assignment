import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  CircleDot, 
  LogOut, 
  Plus, 
  Loader2, 
  AlertTriangle,
  Compass,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Tab contexts
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [tabOrigin, setTabOrigin] = useState<string>('');
  const [tabPath, setTabPath] = useState<string>('');

  // App States
  const [walkthroughs, setWalkthroughs] = useState<any[]>([]);
  const [walkthroughName, setWalkthroughName] = useState<string>('');
  const [recordingActive, setRecordingActive] = useState<boolean>(false);
  const [previewActive, setPreviewActive] = useState<boolean>(false);
  const [activeWalkthrough, setActiveWalkthrough] = useState<any | null>(null);
  const [stepCount, setStepCount] = useState<number>(0);
  
  // Auth Form States
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<{ type: 'network' | 'auth' | 'validation' | 'unknown'; message: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleError = (errorPayload: any) => {
    if (errorPayload && typeof errorPayload === 'object' && errorPayload.type && errorPayload.message) {
      setErrorDetails(errorPayload);
      setErrorMsg('');
    } else {
      setErrorDetails(null);
      setErrorMsg(typeof errorPayload === 'string' ? errorPayload : errorPayload?.message || 'An unexpected error occurred');
    }
  };

  const clearErrors = () => {
    setErrorMsg('');
    setErrorDetails(null);
  };

  // Pull session and active states on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      clearErrors();
      
      // Request active user session
      const response = await chrome.runtime.sendMessage({ action: 'GET_USER' });
      if (response && response.authenticated) {
        setUser(response.user);
        setAuthenticated(true);
        await initTabContext();
      } else {
        setAuthenticated(false);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const initTabContext = async () => {
    try {
      // Query active browser tab details
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        setCurrentTab(tab);
        const url = new URL(tab.url);
        setTabOrigin(url.origin);
        setTabPath(url.pathname);

        // Fetch walkthroughs available for this origin
        await fetchWalkthroughs(url.origin);
      } else {
        setCurrentTab(null);
        setErrorMsg('Please navigate to a web page to use Mini Apty.');
      }

      // Sync active state indicators
      const storage = await chrome.storage.local.get(['recordingState', 'previewState']);
      if (storage.recordingState?.active) {
        setRecordingActive(true);
        setWalkthroughName(storage.recordingState.name);
        setStepCount(storage.recordingState.steps.length);
      }
      if (storage.previewState?.active) {
        setPreviewActive(true);
        setActiveWalkthrough(storage.previewState.walkthrough);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchWalkthroughs = async (origin: string, path?: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_WALKTHROUGHS',
        payload: { origin, path }
      });
      if (response && response.success) {
        setWalkthroughs(response.data || []);
      } else if (response && response.error) {
        handleError(response.error);
      }
    } catch (err: any) {
      handleError('Failed to connect to Service Worker: ' + err.message);
    }
  };

  // Auth execution
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('All fields are required');
      return;
    }
    clearErrors();
    setSuccessMsg('');
    setLoading(true);

    try {
      const action = isLogin ? 'AUTH_LOGIN' : 'AUTH_SIGNUP';
      const response = await chrome.runtime.sendMessage({
        action,
        payload: { email, password }
      });

      if (response && response.success) {
        setSuccessMsg(isLogin ? 'Logged in successfully!' : 'Signed up successfully!');
        setUser(response.user);
        setAuthenticated(true);
        setEmail('');
        setPassword('');
        await initTabContext();
      } else {
        handleError(response?.error || 'Authentication failed');
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearErrors();
    try {
      await chrome.runtime.sendMessage({ action: 'AUTH_LOGOUT' });
      setAuthenticated(false);
      setUser(null);
      setWalkthroughs([]);
      setRecordingActive(false);
      setPreviewActive(false);
    } catch (err: any) {
      handleError(err);
    }
  };

  // Recording controls
  const startRecording = async () => {
    if (!walkthroughName.trim()) {
      setErrorMsg('Please enter a walkthrough name');
      return;
    }
    clearErrors();
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'START_RECORDING',
        payload: {
          name: walkthroughName,
          origin: tabOrigin,
          path: tabPath
        }
      });
      if (response && response.success) {
        setRecordingActive(true);
        setStepCount(0);
        window.close(); // Close popup panel to focus on recording in host page
      } else {
        handleError(response?.error || 'Failed to start recording');
      }
    } catch (err: any) {
      handleError(err);
    }
  };

  const saveRecording = async () => {
    clearErrors();
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ action: 'SAVE_WALKTHROUGH' });
      if (response && response.success) {
        setSuccessMsg(response.offline ? 'Walkthrough saved offline (sync pending)!' : 'Walkthrough saved successfully!');
        setRecordingActive(false);
        setWalkthroughName('');
        setStepCount(0);
        await initTabContext();
      } else {
        handleError(response?.error || 'Failed to save recording');
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelRecording = async () => {
    if (!confirm('Are you sure you want to discard this recording?')) return;
    clearErrors();
    try {
      await chrome.runtime.sendMessage({ action: 'CANCEL_RECORDING' });
      setRecordingActive(false);
      setWalkthroughName('');
      setStepCount(0);
    } catch (err: any) {
      handleError(err);
    }
  };

  // Preview triggers
  const startPreview = async (walkthrough: any) => {
    clearErrors();
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'START_PREVIEW',
        payload: { walkthrough }
      });
      if (response && response.success) {
        setPreviewActive(true);
        setActiveWalkthrough(walkthrough);
        window.close(); // Close popup to let user preview
      } else {
        handleError(response?.error || 'Failed to play walkthrough');
      }
    } catch (err: any) {
      handleError(err);
    }
  };

  const stopPreview = async () => {
    clearErrors();
    try {
      await chrome.runtime.sendMessage({ action: 'END_PREVIEW' });
      setPreviewActive(false);
      setActiveWalkthrough(null);
    } catch (err: any) {
      handleError(err);
    }
  };

  if (loading && !authenticated) {
    return (
      <div className="popup-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={32} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '10px' }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header>
        <h1>
          <Compass size={20} style={{ color: 'var(--color-primary)' }} />
          Mini Apty
        </h1>
        {authenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="user-badge" title={user?.email}>{user?.email}</span>
            <button onClick={handleLogout} className="btn-link" style={{ display: 'flex' }} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      {/* Notifications */}
      {errorMsg && (
        <div className="status-banner status-banner-error animate-fade-in">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}
      {errorDetails && (
        <div className="status-banner status-banner-error animate-fade-in" style={{ alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
              {errorDetails.type === 'network' && 'Connection Failure'}
              {errorDetails.type === 'auth' && 'Authentication Error'}
              {errorDetails.type === 'validation' && 'Validation Error'}
              {errorDetails.type === 'unknown' && 'Unexpected Error'}
            </span>
            <span>{errorDetails.message}</span>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="status-banner status-banner-success animate-fade-in">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Views */}
      {!authenticated ? (
        // Signup/Login Forms
        <form onSubmit={handleAuth} className="card animate-fade-in" style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
            {isLogin ? 'Sign In to Your Account' : 'Register Creator Account'}
          </h2>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already registered? '}
            <button 
              type="button" 
              className="btn-link" 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }}
            >
              {isLogin ? 'Create one' : 'Login instead'}
            </button>
          </div>
        </form>
      ) : (
        // Authenticated Workspace
        <div className="tab-content animate-fade-in">
          {!currentTab ? (
            <div className="empty-state">
              <AlertTriangle size={24} style={{ marginBottom: '8px', color: 'var(--color-danger)' }} />
              Cannot run on this system tab origin. Open a standard webpage to load walkthroughs.
            </div>
          ) : (
            <>
              {/* Record panel */}
              {recordingActive ? (
                <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CircleDot className="animate-pulse" style={{ color: 'var(--color-danger)' }} size={16} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Recording Walkthrough</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', margin: '4px 0', color: 'var(--text-muted)' }}>
                    Name: <strong>{walkthroughName}</strong>
                  </p>
                  <p style={{ fontSize: '0.8125rem', margin: '4px 0 16px 0', color: 'var(--text-muted)' }}>
                    Recorded Steps: <strong>{stepCount}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={saveRecording} className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" size={16} /> : 'Save Walkthrough'}
                    </button>
                    <button onClick={cancelRecording} className="btn btn-secondary" style={{ flex: 0.5 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : previewActive ? (
                <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle2 style={{ color: 'var(--color-success)' }} size={16} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Preview Session Active</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', margin: '4px 0 16px 0', color: 'var(--text-muted)' }}>
                    Playing: <strong>{activeWalkthrough?.name}</strong>
                  </p>
                  <button onClick={stopPreview} className="btn btn-danger">
                    <Square size={14} /> Stop Preview
                  </button>
                </div>
              ) : (
                <div className="card">
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 12px 0' }}>Record New Walkthrough</h3>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Purchase Checkout Flow" 
                      value={walkthroughName}
                      onChange={(e) => setWalkthroughName(e.target.value)}
                    />
                  </div>
                  <button onClick={startRecording} className="btn btn-primary">
                    <Plus size={16} /> Start Recording
                  </button>
                </div>
              )}

              {/* Preview panel */}
              {!recordingActive && !previewActive && (
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 12px 0' }}>Walkthroughs on this Site</h3>
                  {walkthroughs.length === 0 ? (
                    <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      No guides saved for this site yet.
                    </div>
                  ) : (
                    <div className="walkthrough-list">
                      {walkthroughs.map((w) => (
                        <div key={w.id} className="walkthrough-item animate-fade-in">
                          <div>
                            <div className="walkthrough-name" title={w.name}>{w.name}</div>
                            <div className="walkthrough-steps-badge">{w.steps?.length || 0} steps</div>
                          </div>
                          <button onClick={() => startPreview(w)} className="play-btn" title="Play Walkthrough">
                            <Play size={14} style={{ marginLeft: '2px' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="footer-credits">
        Mini Apty DAP Extension • Version 1.0.0
      </div>
    </div>
  );
}
