import { useState } from 'react';

type Page =
  | 'home'
  | 'explore'
  | 'create'
  | 'notifications'
  | 'profile';

const navigation: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'explore', label: 'Explore', icon: '⌕' },
  { id: 'create', label: 'Create', icon: '+' },
  { id: 'notifications', label: 'Notifications', icon: '♡' },
  { id: 'profile', label: 'Profile', icon: '○' }
];

function App() {
  const [activePage, setActivePage] = useState<Page>('home');

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
