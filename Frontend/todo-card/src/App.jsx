import { useEffect, useMemo, useState } from 'react';
import {
  FiArrowRight,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiLogOut,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
  FiPlus
} from 'react-icons/fi';
import './App.css';
import {
  createProfile,
  exportProfiles,
  getApiBase,
  getCurrentUser,
  getProfileById,
  listProfiles,
  logoutUser,
  searchProfiles,
  startWebLogin
} from './lib/api';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiBarChart2, path: '/dashboard' },
  { key: 'profiles', label: 'Profiles', icon: FiUsers, path: '/profiles' },
  { key: 'search', label: 'Search', icon: FiSearch, path: '/search' },
  { key: 'account', label: 'Account', icon: FiUser, path: '/account' }
];

function readRoute(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/' || clean === '/login') {
    return { name: 'dashboard' };
  }

  if (clean.startsWith('/profiles/')) {
    return { name: 'profile-detail', id: decodeURIComponent(clean.split('/')[2] || '') };
  }

  if (NAV_ITEMS.some((item) => item.path === clean)) {
    return { name: clean.slice(1) };
  }

  return { name: 'dashboard' };
}

function formatDate(value) {
  if (!value) return 'N/A';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Pill({ children, tone = 'neutral' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon, note, tone = 'neutral' }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__icon">
        <Icon />
      </div>
      <div>
        <p className="metric-card__label">{label}</p>
        <strong className="metric-card__value">{value}</strong>
        {note ? <p className="metric-card__note">{note}</p> : null}
      </div>
    </article>
  );
}

function LoginScreen({ error }) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__glow auth-shell__glow--one" />
      <div className="auth-shell__glow auth-shell__glow--two" />
      <section className="auth-card">
        <div className="auth-card__eyebrow">
          <FiShield />
          Insighta Labs+
        </div>
        <h1>Secure access for analysts, engineers, and stakeholders.</h1>
        <p>
          The portal uses GitHub OAuth, httpOnly cookies, and the same backend APIs as the CLI. Sign in to
          inspect profiles, search naturally, and manage data with role-aware access.
        </p>
        <div className="auth-card__actions">
          <button className="primary-btn" type="button" onClick={startWebLogin}>
            Continue with GitHub
            <FiArrowRight />
          </button>
        </div>
        {error ? <p className="auth-card__error">{error}</p> : null}
        <dl className="auth-card__facts">
          <div>
            <dt>Session</dt>
            <dd>httpOnly cookies + CSRF protection</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Role-based permissions</dd>
          </div>
          <div>
            <dt>API</dt>
            <dd>{getApiBase() || 'Set VITE_API_BASE_URL'}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function AppShell({ user, route, onNavigate, onLogout, children }) {
  const activeKey = route.name === 'profile-detail' ? 'profiles' : route.name;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-lockup__mark">I+</div>
          <div>
            <p>Insighta Labs+</p>
            <strong>Internal Intelligence Portal</strong>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                onClick={() => onNavigate(item.path)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__account">
          <div>
            <p className="sidebar__account-label">Signed in as</p>
            <strong>@{user.username}</strong>
            <p className="sidebar__account-role">{user.role}</p>
          </div>
          <button className="ghost-btn" type="button" onClick={onLogout}>
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      <main className="content-shell">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">Unified interface</p>
            <h1>{pageTitle(route)}</h1>
          </div>
          <div className="topbar__meta">
            <Pill tone={user.role === 'admin' ? 'success' : 'neutral'}>{user.role}</Pill>
            <Pill tone="info">GitHub OAuth</Pill>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function pageTitle(route) {
  switch (route.name) {
    case 'dashboard':
      return 'Dashboard';
    case 'profiles':
      return 'Profiles';
    case 'search':
      return 'Search';
    case 'account':
      return 'Account';
    case 'profile-detail':
      return 'Profile Detail';
    default:
      return 'Insighta Labs+';
  }
}

function DashboardPage({ user, onNavigate, refreshSignal, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ total: 0, latest: [], topProfiles: [] });
  const [createName, setCreateName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const response = await listProfiles({ page: '1', limit: '5', sort_by: 'created_at', order: 'desc' });

        if (cancelled) return;

        setSummary({
          total: response.total || 0,
          latest: response.data || [],
          topProfiles: (response.data || []).slice(0, 3)
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  async function handleCreateProfile(event) {
    event.preventDefault();

    if (!createName.trim()) return;

    setCreateBusy(true);
    try {
      await createProfile(createName.trim());
      setCreateName('');
      onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="hero-grid">
        <MetricCard label="Total Profiles" value={loading ? '…' : summary.total} icon={FiUsers} note="Current dataset" tone="success" />
        <MetricCard label="Signed-in Role" value={user.role} icon={FiShield} note="Access enforced server-side" tone="info" />
        <MetricCard label="Latest Sync" value={loading ? '…' : formatDate(summary.latest[0]?.created_at)} icon={FiBarChart2} note="Most recent record" tone="neutral" />
      </section>

      <section className="grid-2">
        <Panel title="Recent Profiles" subtitle="Freshest records returned by the backend" actions={<button className="ghost-btn" type="button" onClick={() => onNavigate('/profiles')}>Open profiles</button>}>
          {loading ? <LoaderBlock label="Loading dashboard metrics" /> : null}
          {error ? <Notice tone="danger" text={error} /> : null}
          {!loading ? (
            <div className="mini-list">
              {summary.latest.map((profile) => (
                <button key={profile.id} className="mini-list__item" type="button" onClick={() => onNavigate(`/profiles/${profile.id}`)}>
                  <div>
                    <strong>{profile.name}</strong>
                    <p>{profile.country_name || profile.country_id} · {profile.gender} · {profile.age_group}</p>
                  </div>
                  <FiChevronRight />
                </button>
              ))}
              {!summary.latest.length ? <EmptyState title="No profiles yet" text="Create the first profile to populate the dashboard." /> : null}
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Admin Tools"
          subtitle="Create profiles without leaving the portal"
          actions={user.role === 'admin' ? <Pill tone="success">Admin only</Pill> : <Pill tone="warning">Read only</Pill>}
        >
          {user.role === 'admin' ? (
            <form className="inline-form" onSubmit={handleCreateProfile}>
              <label className="field">
                <span>Profile name</span>
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Harriet Tubman"
                />
              </label>
              <button className="primary-btn primary-btn--compact" type="submit" disabled={createBusy}>
                <FiPlus />
                {createBusy ? 'Creating…' : 'Create profile'}
              </button>
            </form>
          ) : (
            <Notice tone="info" text="Your account is read-only. Admin users can create and delete profiles." />
          )}
        </Panel>
      </section>

      <Panel title="Quick Links" subtitle="Move between portal surfaces">
        <div className="quick-links">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} type="button" className="quick-link" onClick={() => onNavigate(item.path)}>
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function ProfilesPage({ onNavigate, user }) {
  const [filters, setFilters] = useState({ gender: '', country_id: '', age_group: '', page: '1', limit: '10', sort_by: 'created_at', order: 'desc' });
  const [query, setQuery] = useState(filters);
  const [data, setData] = useState({ items: [], page: 1, limit: 10, total: 0, total_pages: 1, links: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      setError('');

      try {
        const response = await listProfiles(query);
        if (cancelled) return;

        setData({
          items: response.data || [],
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || 0,
          total_pages: response.total_pages || 1,
          links: response.links || {}
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load profiles');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [query]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setQuery({ ...filters, page: '1' });
  }

  async function exportCurrent() {
    setExportBusy(true);
    try {
      const blob = await exportProfiles(query);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `profiles_${timestamp}.csv`);
    } catch (err) {
      setError(err.message || 'Failed to export profiles');
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Panel
      title="Profiles"
      subtitle="Filter, sort, page, and export the dataset"
      actions={
        <div className="panel-actions">
          {user.role === 'admin' ? (
            <button className="ghost-btn" type="button" onClick={exportCurrent} disabled={exportBusy}>
              <FiDownload />
              {exportBusy ? 'Exporting…' : 'Export CSV'}
            </button>
          ) : null}
        </div>
      }
    >
      <form className="filters-grid" onSubmit={applyFilters}>
        <label className="field">
          <span>Gender</span>
          <select value={filters.gender} onChange={(event) => updateFilter('gender', event.target.value)}>
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="field">
          <span>Country</span>
          <input value={filters.country_id} onChange={(event) => updateFilter('country_id', event.target.value.toUpperCase())} placeholder="NG" />
        </label>
        <label className="field">
          <span>Age group</span>
          <select value={filters.age_group} onChange={(event) => updateFilter('age_group', event.target.value)}>
            <option value="">Any</option>
            <option value="child">Child</option>
            <option value="teenager">Teenager</option>
            <option value="adult">Adult</option>
            <option value="senior">Senior</option>
          </select>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={filters.sort_by} onChange={(event) => updateFilter('sort_by', event.target.value)}>
            <option value="created_at">Created at</option>
            <option value="age">Age</option>
            <option value="gender_probability">Gender probability</option>
          </select>
        </label>
        <label className="field">
          <span>Order</span>
          <select value={filters.order} onChange={(event) => updateFilter('order', event.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <label className="field">
          <span>Limit</span>
          <input type="number" min="1" max="50" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)} />
        </label>
        <button className="primary-btn primary-btn--compact" type="submit">
          <FiSearch />
          Apply filters
        </button>
      </form>

      {loading ? <LoaderBlock label="Loading profiles" /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}

      {!loading ? (
        <>
          <div className="table-toolbar">
            <span>{data.total} profiles</span>
            <span>Page {data.page} of {data.total_pages}</span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Country</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((profile) => (
                  <tr key={profile.id} onClick={() => onNavigate(`/profiles/${profile.id}`)}>
                    <td>
                      <strong>{profile.name}</strong>
                      <small>{profile.id}</small>
                    </td>
                    <td>{profile.gender}</td>
                    <td>{profile.age} · {profile.age_group}</td>
                    <td>{profile.country_name || profile.country_id}</td>
                    <td>{formatDate(profile.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data.items.length ? <EmptyState title="No profiles found" text="Try adjusting the filters or create a new profile." /> : null}

          <div className="pagination">
            <button className="ghost-btn" type="button" disabled={data.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: String(Math.max(1, Number(current.page || 1) - 1)) }))}>
              <FiChevronLeft /> Previous
            </button>
            <button className="ghost-btn" type="button" disabled={data.page >= data.total_pages} onClick={() => setQuery((current) => ({ ...current, page: String(Number(current.page || 1) + 1) }))}>
              Next <FiChevronRight />
            </button>
          </div>
        </>
      ) : null}
    </Panel>
  );
}

function SearchPage({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState('');

  async function handleSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSubmitted(query.trim());

    try {
      const response = await searchProfiles(query.trim(), { page: '1', limit: '10' });
      setResults(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to search profiles');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel title="Natural Language Search" subtitle="Find profiles with plain language queries like “young males from Nigeria”">
      <form className="search-bar" onSubmit={handleSearch}>
        <label className="field field--grow">
          <span>Search query</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="young males from nigeria" />
        </label>
        <button className="primary-btn primary-btn--compact" type="submit">
          <FiSearch />
          Search
        </button>
      </form>

      {loading ? <LoaderBlock label="Searching profiles" /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}

      {submitted ? <p className="result-caption">Results for “{submitted}”</p> : null}

      <div className="search-results">
        {results.map((profile) => (
          <button key={profile.id} type="button" className="search-results__item" onClick={() => onNavigate(`/profiles/${profile.id}`)}>
            <div>
              <strong>{profile.name}</strong>
              <p>{profile.gender} · {profile.age} · {profile.country_name || profile.country_id}</p>
            </div>
            <FiArrowRight />
          </button>
        ))}
        {!loading && !results.length ? <EmptyState title="No results yet" text="Run a natural language query to see matches here." /> : null}
      </div>
    </Panel>
  );
}

function ProfileDetailPage({ profileId, onNavigate }) {
  const [state, setState] = useState({ loading: true, error: '', profile: null });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setState({ loading: true, error: '', profile: null });

      try {
        const response = await getProfileById(profileId);
        if (!cancelled) {
          setState({ loading: false, error: '', profile: response.data || null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ loading: false, error: err.message || 'Failed to load profile', profile: null });
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (state.loading) {
    return <LoaderBlock label="Loading profile detail" />;
  }

  if (state.error) {
    return <Notice tone="danger" text={state.error} action={<button className="ghost-btn" type="button" onClick={() => onNavigate('/profiles')}>Back to profiles</button>} />;
  }

  if (!state.profile) {
    return <EmptyState title="Profile not found" text="The requested profile could not be loaded." action={<button className="ghost-btn" type="button" onClick={() => onNavigate('/profiles')}>Back to profiles</button>} />;
  }

  const profile = state.profile;

  return (
    <div className="stack">
      <Panel
        title={profile.name}
        subtitle={`${profile.gender} · ${profile.age} · ${profile.country_name || profile.country_id}`}
        actions={<button className="ghost-btn" type="button" onClick={() => onNavigate('/profiles')}><FiChevronLeft /> Back</button>}
      >
        <div className="detail-grid">
          {[
            ['ID', profile.id],
            ['Gender probability', profile.gender_probability],
            ['Age group', profile.age_group],
            ['Country', profile.country_name || profile.country_id],
            ['Country probability', profile.country_probability],
            ['Created at', formatDate(profile.created_at)]
          ].map(([label, value]) => (
            <div key={label} className="detail-card">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AccountPage({ user }) {
  return (
    <Panel title="Account" subtitle="Your authenticated session and access level">
      <div className="detail-grid detail-grid--account">
        {[
          ['Username', `@${user.username}`],
          ['Email', user.email || 'Not provided'],
          ['Role', user.role],
          ['Status', user.is_active ? 'Active' : 'Inactive'],
          ['Last login', formatDate(user.last_login_at)],
          ['Created at', formatDate(user.created_at)]
        ].map(([label, value]) => (
          <div key={label} className="detail-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LoaderBlock({ label }) {
  return (
    <div className="loader-block" role="status" aria-live="polite">
      <div className="loader-block__spinner" />
      <p>{label}</p>
    </div>
  );
}

function Notice({ tone = 'neutral', text, action }) {
  return (
    <div className={`notice notice--${tone}`}>
      <div>
        <strong>{tone === 'danger' ? 'Error' : 'Notice'}</strong>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <FiFileText />
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => readRoute(window.location.pathname));
  const [session, setSession] = useState({ status: 'loading', user: null, error: '' });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      if (!getApiBase()) {
        setSession({ status: 'error', user: null, error: 'Set VITE_API_BASE_URL before running the portal.' });
        return;
      }

      try {
        const response = await getCurrentUser();
        if (!cancelled) {
          setSession({ status: 'ready', user: response.data, error: '' });
        }
      } catch {
        if (!cancelled) {
          setSession({ status: 'ready', user: null, error: '' });
        }
      }
    }

    hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (session.status === 'ready' && session.user && route.name === 'dashboard' && window.location.pathname === '/login') {
      navigate('/dashboard');
    }
  }, [route.name, session]);

  const navigate = useMemo(() => {
    return (path) => {
      window.history.pushState({}, '', path);
      setRoute(readRoute(path));
    };
  }, []);

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      setSession({ status: 'ready', user: null, error: '' });
      navigate('/login');
      setRefreshTick((value) => value + 1);
    }
  }

  function handleRefreshSession() {
    setRefreshTick((value) => value + 1);
  }

  if (session.status === 'loading') {
    return <LoaderBlock label="Synchronizing session" />;
  }

  if (session.status === 'error') {
    return <Notice tone="danger" text={session.error} />;
  }

  if (!session.user) {
    return <LoginScreen error={session.error} />;
  }

  return (
    <AppShell user={session.user} route={route} onNavigate={navigate} onLogout={handleLogout}>
      {route.name === 'dashboard' ? <DashboardPage user={session.user} onNavigate={navigate} refreshSignal={refreshTick} onRefresh={handleRefreshSession} /> : null}
      {route.name === 'profiles' ? <ProfilesPage onNavigate={navigate} user={session.user} /> : null}
      {route.name === 'search' ? <SearchPage onNavigate={navigate} /> : null}
      {route.name === 'account' ? <AccountPage user={session.user} /> : null}
      {route.name === 'profile-detail' ? <ProfileDetailPage profileId={route.id} onNavigate={navigate} /> : null}
    </AppShell>
  );
}
