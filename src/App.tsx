import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Page =
  | 'home'
  | 'explore'
  | 'create'
  | 'notifications'
  | 'profile';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const navigation: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'explore', label: 'Explore', icon: '⌕' },
  { id: 'create', label: 'Create', icon: '+' },
  { id: 'notifications', label: 'Notifications', icon: '♡' },
  { id: 'profile', label: 'Profile', icon: '○' }
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activePage, setActivePage] = useState<Page>('home');

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setMessage('Choose a new password for your account.');
        setError('');
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;

        if (sessionError) {
          setError('Unable to restore your session. Please sign in again.');
        }

        setSession(data.session);
      })
      .catch(() => {
        if (mounted) {
          setError('Unable to connect to the authentication service.');
        }
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setMessage('');
    setError('');
    setPassword('');
    setNewPassword('');
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      if (authMode === 'signup') {
        const cleanUsername = username.trim().toLowerCase();
        const cleanDisplayName = displayName.trim();

        if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
          throw new Error(
            'Username must contain 3–30 letters, numbers or underscores.'
          );
        }

        if (cleanDisplayName.length < 1 || cleanDisplayName.length > 60) {
          throw new Error('Display name must be between 1 and 60 characters.');
        }

        if (password.length < 8) {
          throw new Error('Password must contain at least 8 characters.');
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: cleanDisplayName,
              username: cleanUsername
            }
          }
        });

        if (signupError) throw signupError;

        if (data.session) {
          setSession(data.session);
          setMessage('Welcome to Celebration of Life!');
        } else {
          setMessage(
            'Account created. Please check your email and confirm your address before signing in.'
          );
          setAuthMode('login');
          setPassword('');
        }
      }

      if (authMode === 'login') {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
          });

        if (loginError) throw loginError;

        setSession(data.session);
        setPassword('');
        setMessage('Welcome back!');
      }

      if (authMode === 'forgot') {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            {
              redirectTo: window.location.origin
            }
          );

        if (resetError) throw resetError;

        setMessage(
          'If an account exists for this email, a password reset link will be sent.'
        );
      }

      if (authMode === 'reset') {
        if (newPassword.length < 8) {
          throw new Error('New password must contain at least 8 characters.');
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) throw updateError;

        setNewPassword('');
        setAuthMode('login');
        setMessage('Password updated successfully. Please sign in.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setError('');
    setMessage('');
    setSubmitting(true);

    const { error: logoutError } = await supabase.auth.signOut();

    setSubmitting(false);

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    setSession(null);
    setAuthMode('login');
    setActivePage('home');
    setPassword('');
    setMessage('You have signed out successfully.');
  }

  if (authLoading) {
    return (
      <div className="auth-loading">
        <span className="brand-mark">C</span>
        <p>Preparing your Celebration of Life...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-decoration auth-decoration-one">✦</div>
        <div className="auth-decoration auth-decoration-two">✧</div>

        <main className="auth-card">
          <a className="brand auth-brand" href="#welcome">
            <span className="brand-mark">C</span>
            <span>
              <strong>COL</strong>
              <small>Celebration of Life</small>
            </span>
          </a>

          <span className="eyebrow">A WORLD OF HAPPY MOMENTS</span>

          <h1>
            {authMode === 'signup' && 'Join the celebration.'}
            {authMode === 'login' && 'Welcome back.'}
            {authMode === 'forgot' && 'Reset your password.'}
            {authMode === 'reset' && 'Create a new password.'}
          </h1>

          <p className="auth-description">
            {authMode === 'signup' &&
              'Create your account and start sharing the moments that make life beautiful.'}
            {authMode === 'login' &&
              'Sign in to reconnect with people and memories worth celebrating.'}
            {authMode === 'forgot' &&
              'Enter your email address and we will send you a password reset link if an account exists.'}
            {authMode === 'reset' &&
              'Choose a new secure password for your COL account.'}
          </p>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <>
                <label htmlFor="displayName">Your name</label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={60}
                  required
                />

                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value.replace(/\s/g, '').toLowerCase())
                  }
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9_]{3,30}"
                  required
                />
                <small className="field-hint">
                  3–30 characters. Letters, numbers and underscores only.
                </small>
              </>
            )}

            {authMode !== 'reset' && (
              <>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </>
            )}

            {(authMode === 'login' || authMode === 'signup') && (
              <>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={
                    authMode === 'signup'
                      ? 'new-password'
                      : 'current-password'
                  }
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </>
            )}

            {authMode === 'reset' && (
              <>
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </>
            )}

            {authMode === 'login' && (
              <button
                className="text-button forgot-button"
                type="button"
                onClick={() => changeAuthMode('forgot')}
              >
                Forgot password?
              </button>
            )}

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}

            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? 'Please wait...'
                : authMode === 'signup'
                  ? 'Create account'
                  : authMode === 'login'
                    ? 'Sign in'
                    : authMode === 'forgot'
                      ? 'Send reset link'
                      : 'Update password'}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === 'login' && (
              <p>
                New to COL?{' '}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => changeAuthMode('signup')}
                >
                  Create an account
                </button>
              </p>
            )}

            {authMode === 'signup' && (
              <p>
                Already a member?{' '}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => changeAuthMode('login')}
                >
                  Sign in
                </button>
              </p>
            )}

            {(authMode === 'forgot' || authMode === 'reset') && (
              <p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => changeAuthMode('login')}
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>

          <footer className="auth-footer">
            Every Moment. Every Memory. Every Life.
          </footer>
        </main>
      </div>
    );
  }

  const pageTitles: Record<Page, string> = {
    home: 'Happy moments, shared with the world.',
    explore: 'Discover moments around the world.',
    create: 'Share a moment worth celebrating.',
    notifications: 'Your celebrations and updates.',
    profile: 'Your story. Your moments.'
  };

  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setActivePage('home');
          }}
          aria-label="Celebration of Life home"
        >
          <span className="brand-mark">C</span>
          <span>
            <strong>COL</strong>
            <small>Celebration of Life</small>
          </span>
        </a>

        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="Notifications"
            onClick={() => setActivePage('notifications')}
          >
            ♡
          </button>

          <button
            className="profile-button"
            type="button"
            onClick={() => setActivePage('profile')}
            aria-label="Open profile"
          >
            C
          </button>

          <button
            className="text-button"
            type="button"
            onClick={handleLogout}
            disabled={submitting}
          >
            {submitting ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <p className="sidebar-heading">YOUR SPACE</p>

          <nav aria-label="Main navigation">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${
                  activePage === item.id ? 'active' : ''
                }`}
                onClick={() => setActivePage(item.id)}
                aria-current={
                  activePage === item.id ? 'page' : undefined
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-message">
            <span className="sidebar-message-icon">✦</span>
            <p>Every moment has a story worth sharing.</p>
          </div>
        </aside>

        <main className="main-content">
          <section className="welcome-section">
            <div>
              <span className="eyebrow">A WORLD OF HAPPY MOMENTS</span>
              <h1>{pageTitles[activePage]}</h1>
              <p>
                Celebrate life, connect with people, and make
                every memory count.
              </p>
            </div>

            <div className="welcome-decoration" aria-hidden="true">
              ✨
            </div>
          </section>

          {activePage === 'home' && (
            <section className="content-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">YOUR COMMUNITY</span>
                  <h2>Moments to celebrate</h2>
                </div>
              </div>

              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <h3>Your happy moments feed starts here</h3>
                <p>
                  Discover birthdays, achievements, family
                  memories, travel stories, and celebrations
                  shared by people around the world.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setActivePage('explore')}
                >
                  Explore moments
                </button>
              </div>
            </section>
          )}

          {activePage === 'explore' && (
            <section className="content-section">
              <div className="empty-state">
                <div className="empty-icon">🌍</div>
                <h3>A world full of celebrations</h3>
                <p>
                  Explore public moments and discover stories
                  from different people and places.
                </p>
              </div>
            </section>
          )}

          {activePage === 'create' && (
            <section className="content-section">
              <div className="empty-state">
                <div className="empty-icon">📸</div>
                <h3>Your next memory begins here</h3>
                <p>
                  Post creation, photo and video uploads, and
                  optional music attachment will be connected
                  in the creation workflow.
                </p>
              </div>
            </section>
          )}

          {activePage === 'notifications' && (
            <section className="content-section">
              <div className="empty-state">
                <div className="empty-icon">🔔</div>
                <h3>Stay close to every celebration</h3>
                <p>
                  Likes, comments, follows, and other
                  notifications will appear here.
                </p>
              </div>
            </section>
          )}

          {activePage === 'profile' && (
            <section className="content-section">
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Your personal space</h3>
                <p>
                  Your profile, memories, followers, and
                  privacy settings will be available here.
                </p>
              </div>
            </section>
          )}

          <footer className="footer">
            <span>COL · Celebration of Life</span>
            <span>Every Moment. Every Memory. Every Life.</span>
          </footer>
        </main>
      </div>

      <nav className="mobile-navigation" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? 'active' : ''}
            onClick={() => setActivePage(item.id)}
            aria-label={item.label}
            aria-current={
              activePage === item.id ? 'page' : undefined
            }
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
