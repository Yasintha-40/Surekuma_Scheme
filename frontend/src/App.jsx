import { useEffect, useRef, useState } from 'react'
import api from './services/api'
import './App.css'
import PublicExperience from './components/PublicExperience'

const label = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
const message = (error) => error.response?.data?.message || 'Unable to complete that request.'
const Status = ({ value }) => <span className={`status ${value}`}>{label(value)}</span>
const accountName = user => user.email?.split('@')[0] || 'Member';
const accountInitials = user => accountName(user).slice(0, 2).toUpperCase();

function Intro({ eyebrow, title, text }) { return <div className="intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div> }
function Empty({ text }) { return <div className="empty"><span></span><p>{text}</p></div> }

const Icons = {
  Grid: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>,
  Scan: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" y1="12" x2="17" y2="12" /></svg>,
  Search: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Clipboard: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>,
  File: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  User: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Bell: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  Help: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Lock: () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Logout: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  ShieldCheck: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>,
  IdCard: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="8" cy="15" r="2" /><line x1="13" y1="14" x2="18" y2="14" /><line x1="13" y1="17" x2="16" y2="17" /></svg>,
  Passport: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="11" r="3" /><line x1="7" y1="18" x2="17" y2="18" /></svg>,
  Camera: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  Settings: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  Users: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Layers: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  BarChart: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
};


const applicantLinks = [
  ['dashboard', Icons.Grid, 'Overview'],
  ['application', Icons.Scan, 'Application form'],
  ['documents', Icons.File, 'Document upload'],
  ['status', Icons.Clipboard, 'Application status'],
  ['profile', Icons.User, 'Profile'],
];

const adminLinks = [
  ['admin-dashboard', Icons.Grid, 'Dashboard'],
  ['admin-applications', Icons.File, 'All applications'],
  ['admin-memberships', Icons.Users, 'Memberships'],
  ['admin-schemes', Icons.Layers, 'Pension schemes'],
  ['admin-reports', Icons.BarChart, 'Reports'],
  ['admin-users', Icons.User, 'Users']
];

function Sidebar({ admin, officer, page, go, logout }) {
  const links = officer ? [['officer-dashboard', Icons.Grid, 'Dashboard'], ['officer-applications', Icons.File, 'Approved applications']] : admin ? adminLinks : applicantLinks;
  return (
    <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => go(links[0][0])}>
          <div className="emblem-box">
          <img src="/company-logo.png" alt="Sri Lanka Tourism Development Authority" />
          </div>
        <div className="brand-text-block">
          <span className="authority-subtitle">SRI LANKA TOURISM DEVELOPMENT AUTHORITY</span>
          <span className="system-title">SUREKUMA</span>
        </div>
      </div>
      <p className="workspace-label">{officer ? 'INSURANCE COMPANY CONSOLE' : admin ? 'SLTDA ADMIN CONSOLE' : 'APPLICANT PORTAL'}</p>
      <nav className="sidebar-menu">
        {links.map(([id, Icon, name]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>
            <i className="nav-icon"><Icon /></i>
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="secure-session-badge">
          <Icons.Lock />
          <span>Secure session</span>
        </div>
        <button className="logout-btn" onClick={logout}>
          <Icons.Logout />
          <span> Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function Shell({ user, page, go, logout, children }) {
  const pageMeta = {
    'dashboard': ['Dashboard', 'Identify or record a person'],
    'application': ['Application Form', 'Build your application'],
    'documents': ['Document Upload', 'Keep your documents together'],
    'status': ['Application Status', 'Track your progress'],
    'profile': ['Profile', 'Your account details'],
    'officer-dashboard': ['Insurance Officer Dashboard', 'Applications approved by Admin'],
    'officer-applications': ['Approved applications', 'Applications approved by Admin'],
    'officer-details': ['Application details', 'Approved application record'],
    'admin-dashboard': ['Dashboard', 'Applications awaiting review and current programme activity'],
    'admin-applications': ['Applications', 'Review applications and records'],
    'admin-memberships': ['Memberships', 'Approved membership records'],
    'admin-schemes': ['Pension Schemes', 'Plans currently stored in the database'],
    'admin-reports': ['Reports', 'Application activity and statistics'],
    'admin-users': ['Users', 'Registered Surekuma users'],
    'admin-details': ['Application Review', 'Examine applicant details and submit decision']
  };

  const [title, subtitle] = pageMeta[page] || ['Dashboard', 'Overview at a glance'];

  return (
    <main className={`shell ${['admin', 'insurance_officer'].includes(user.role) ? 'staff-workspace' : ''}`}>
      <Sidebar officer={user.role === 'insurance_officer'} admin={user.role === 'admin'} page={page} go={go} logout={logout} />
      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-right">
            <div className="authorized-badge">
              <Icons.ShieldCheck />
              <span>AUTHORIZED SESSION</span>
            </div>
            <div className="user-profile-pill">
              <span className="avatar-initials">{accountInitials(user)}</span>
              <div className="user-meta">
                <strong>{user.email}</strong>
                <small>{user.role === 'admin' ? 'SLTDA Officer (Admin)' : label(user.role)}</small>
              </div>
              <svg className="chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
          </div>
        </header>
        <div className="gold-accent-bar" />
        <div className="workspace-body">
          {children}
        </div>
      </section>
    </main>
  );
}

function Applicant({ user, page, go }) {
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/applications/my');
      setApps(r.data);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const r = await api.get('/applications/my');
        if (isMounted) {
          setApps(r.data);
        }
      } catch (e) {
        if (isMounted) {
          setError(message(e));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [page]);

  const start = async () => {
    try {
      const { data } = await api.post('/applications');
      setSelected(data.application.id);
      await load();
      go('application');
    } catch (e) {
      alert(message(e));
    }
  };

  const filteredApps = searchQuery.trim()
    ? apps.filter(a =>
      (a.application_no && a.application_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.full_name && a.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.scheme_name && a.scheme_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.status && a.status.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    : apps;

  const openDocuments = () => {
    if (!loading && (selected || apps[0]?.id)) go('documents');
    else if (!loading) go('application');
  };

  const markSubmitted = applicationId => {
    setApps(current => current.map(application => application.id === applicationId
      ? { ...application, status: 'submitted' }
      : application));
  };

  if (page === 'application') return <ApplicationForm appId={selected || apps[0]?.id} onCreated={setSelected} onSubmitted={markSubmitted} go={go} />;
  if (page === 'documents') return <Documents appId={selected} apps={apps} onSelect={setSelected} onSubmitted={markSubmitted} />;
  if (page === 'status') return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Track your progress.</h1>
        <p className="hero-desc">View your application status and comments from our review team.</p>

        <div className="action-cards-grid">
          <button className="task-action-card" onClick={() => setSearchQuery('')}>
            <div className="action-icon-badge">
              <Icons.File />
            </div>
            <div className="action-card-text">
              <strong>All applications</strong>
              <span>View all records</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button className="task-action-card" onClick={() => setSearchQuery('under_review')}>
            <div className="action-icon-badge">
              <Icons.ShieldCheck />
            </div>
            <div className="action-card-text">
              <strong>Under review</strong>
              <span>Pending assessment</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button className="task-action-card" onClick={() => setSearchQuery('approved')}>
            <div className="action-icon-badge">
              <Icons.Users />
            </div>
            <div className="action-card-text">
              <strong>Approved</strong>
              <span>Active memberships</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>
        </div>

        <div className="hero-search-row">
          <div className="search-input-wrapper">
            <span className="search-icon-inside"><Icons.Search /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="NIC or application number"
            />
          </div>
          <button className="hero-search-btn" onClick={start}>
            Create new application {'>'}
          </button>
        </div>
      </div>

      {loading && <p className="notice">Loading applications</p>}
      {error && <p className="notice">{error}</p>}
      <section className="panel">
        <h2>Recent applications</h2>
        <AppList apps={filteredApps} select={id => { setSelected(id); go('application'); }} />
      </section>
    </section>
  );
  if (page === 'profile') return <Profile user={user} />;

  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Hello, {accountName(user)}.</h1>
        <p className="hero-desc">Everything you need to manage your pension journey is here.</p>

        <div className="action-cards-grid">
          <button className="task-action-card" onClick={start}>
            <div className="action-icon-badge">
              <Icons.IdCard />
            </div>
            <div className="action-card-text">
              <strong>Create new application</strong>
              <span>Start your application</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button className="task-action-card" onClick={openDocuments}>
            <div className="action-icon-badge">
              <Icons.File />
            </div>
            <div className="action-card-text">
              <strong>Document upload</strong>
              <span>Upload identity or proof files</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button className="task-action-card" onClick={() => go('status')}>
            <div className="action-icon-badge">
              <Icons.Clipboard />
            </div>
            <div className="action-card-text">
              <strong>Application status</strong>
              <span>Track review and updates</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>
        </div>

        <div className="hero-search-row">
          <div className="search-input-wrapper">
            <span className="search-icon-inside"><Icons.Search /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="NIC or application number"
            />
          </div>
          <button className="hero-search-btn" onClick={start}>
            Create new application {'>'}
          </button>
        </div>
      </div>

      {loading && <p className="notice">Loading applications</p>}
      {error && <p className="notice">{error}</p>}
      <section className="panel">
        <h2>Recent applications</h2>
        <AppList apps={filteredApps} select={id => { setSelected(id); go('application'); }} />
      </section>
    </section>
  );
}

function AppList({ apps, select }) {
  return apps.length ? (
    <div className="rows">
      {apps.map(a => (
        <article key={a.id} className="app-record-row">
          <span className="row-icon-badge"><Icons.File /></span>
          <div className="row-main-info">
            <strong>{a.application_no}</strong>
            <p>{a.full_name || 'Draft application'} . {a.scheme_name || 'Scheme not selected'}</p>
            {a.admin_comment && <small>Admin: {a.admin_comment}</small>}
          </div>
          <Status value={a.status} />
          <button className="text open-btn" onClick={() => select(a.id)}>Open {'>'}</button>
        </article>
      ))}
    </div>
  ) : (
    <Empty text="No applications yet. Create one to begin your pension journey." />
  );
}

function ApplicationForm({ appId, onCreated, onSubmitted, go }) {
  const [id, setId] = useState(appId);
  const createdDraftId = useRef(null);
  const saving = useRef(false);
  const [form, setForm] = useState({ profile: {}, employment: {}, socialSecurity: {}, selection: {}, family: [{}], beneficiaries: [{}] });
  const [schemes, setSchemes] = useState([]);
  const [step, setStep] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [divisionalSecretariats, setDivisionalSecretariats] = useState([]);
  const [tourismCategories, setTourismCategories] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [registrationError, setRegistrationError] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('draft');
  const [latestReviewAction, setLatestReviewAction] = useState(null);
  const canEdit = ['draft', 'correction_required', 'rejected'].includes(applicationStatus)
    || (applicationStatus === 'submitted' && latestReviewAction === 'rejected');

  // Refresh the decision without replacing any unsaved form values.
  useEffect(() => {
    if (!id) return;
    let active = true;
    const refreshDecision = async () => {
      if (saving.current || document.visibilityState === 'hidden') return;
      try {
        const { data } = await api.get('/applications/my');
        const application = data.find(item => String(item.id) === String(id));
        if (active && !saving.current && application) {
          setApplicationStatus(application.status);
          setLatestReviewAction(application.latest_review_action);
          setNote('');
        }
      } catch { /* Keep the form intact; save errors are shown by the save handler. */ }
    };
    window.addEventListener('focus', refreshDecision);
    const timer = window.setInterval(refreshDecision, 10000);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshDecision);
      window.clearInterval(timer);
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    api.get('/applications/registration')
      .then(({ data }) => { if (active) setRegistration(data); })
      .catch(() => { if (active) setRegistrationError('Unable to load your registration details. Please reload and try again.'); })
      .finally(() => { if (active) setRegistrationLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // A newly created draft already has its current values in this form.
    // Fetching it during its first save can replace them with an empty profile.
    if (id && id === createdDraftId.current) return;
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        const schemesRes = await api.get('/applications/schemes');
        if (isMounted) {
          setSchemes(schemesRes.data);
        }

        if (id) {
          const appRes = await api.get(`/applications/${id}`);
          if (isMounted) {
            setApplicationStatus(appRes.data.application?.status || 'draft');
            setLatestReviewAction(appRes.data.application?.latest_review_action || null);
            const profile = appRes.data.profile || {};
            const employment = appRes.data.employment || {};
            setForm({
              ...appRes.data,
              profile,
              socialSecurity: appRes.data.socialSecurity || {},
              selection: appRes.data.selection || {},
              employment,
              family: appRes.data.family && appRes.data.family.length ? appRes.data.family : [{}],
              beneficiaries: appRes.data.beneficiaries && appRes.data.beneficiaries.length ? appRes.data.beneficiaries : [{}]
            });
          }
        }
      } catch (e) {
        if (isMounted) {
          setNote(message(e));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    api.get('/applications/locations/districts')
      .then(({ data }) => isMounted && setDistricts(data))
      .catch(error => isMounted && setNote(message(error)))
      .finally(() => isMounted && setLocationsLoading(false));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.get('/applications/tourism-categories')
      .then(({ data }) => isMounted && setTourismCategories(data))
      .catch(error => isMounted && setNote(message(error)))
      .finally(() => isMounted && setCategoriesLoading(false));
    return () => { isMounted = false; };
  }, []);

  const selectedDistrict = districts.find(district => district.district_name === form.profile?.district);
  useEffect(() => {
    let isMounted = true;
    if (!selectedDistrict) {
      setDivisionalSecretariats([]);
      return () => { isMounted = false; };
    }
    api.get('/applications/locations/divisional-secretariats', { params: { district_id: selectedDistrict.id } })
      .then(({ data }) => isMounted && setDivisionalSecretariats(data))
      .catch(error => isMounted && setNote(message(error)));
    return () => { isMounted = false; };
  }, [selectedDistrict?.id]);

  const field = (group, key, value) => setForm(current => ({
    ...current,
    [group]: { ...current[group], [key]: value }
  }));
  const save = async () => {
    if (loading || saving.current) return null;
    if (!canEdit) {
      setNote('This application has already been submitted and cannot be edited.');
      return null;
    }
    saving.current = true;
    try {
      let current = id;
      if (!current) {
        const { data } = await api.post('/applications');
        current = data.application.id;
        createdDraftId.current = current;
        setId(current);
        onCreated(current);
      }
      const payload = form;
      const { data: savedApplication } = await api.put(`/applications/${current}`, payload);
      if (savedApplication?.status) setApplicationStatus(savedApplication.status);
      setNote('Draft saved successfully.');
      return current;
    } catch (e) {
      setNote(message(e));
      return null;
    } finally {
      saving.current = false;
    }
  };
  const moveToStep = async nextStep => {
    if (nextStep === step || loading) return;
    if (!canEdit) {
      setNote('This application is read-only.');
      setStep(nextStep);
      return;
    }
    const current = await save();
    if (current) {
      setNote('Progress saved.');
      setStep(nextStep);
    }
  };
  const submit = async () => {
    if (loading || saving.current) return;
    if (!canEdit) {
      go('documents');
      return;
    }
    const missing = [];
    if (!form.profile?.full_name?.trim()) missing.push('full name');
    if (!form.profile?.nic?.trim()) missing.push('NIC number');
    if (!form.selection?.scheme_id) missing.push('pension scheme');
    if (missing.length) {
      setStep(!form.profile?.full_name?.trim() || !form.profile?.nic?.trim() ? 1 : 4);
      setNote(`Please complete: ${missing.join(', ')} before submitting.`);
      return;
    }
    try {
      const current = await save();
      if (!current) return;
      await api.post(`/applications/${current}/submit`);
      setApplicationStatus('submitted');
      setId(current);
      onCreated?.(current);
      onSubmitted?.(current);
      window.alert('Application submitted successfully.');
      go('documents');
    } catch (e) {
      setNote(message(e));
    }
  };

  const stepsList = [
    { title: 'Applicant information', icon: Icons.User },
    { title: 'Employment & social security', icon: Icons.Clipboard },
    { title: 'Family details', icon: Icons.Users },
    { title: 'Scheme & beneficiary', icon: Icons.Layers }
  ];

  const personal = (
    <div className="grid">
      <div className="registration-record" aria-live="polite">
        <span>SLTDA registration number</span>
        <strong>{registrationLoading ? 'Loading registration...' : registrationError ? 'Registration unavailable' : registration?.sltda_registration_no || 'No registration number on file'}</strong>
        <small>{registrationError || (registration?.sltda_registration_no ? `Registered to ${registration.email}` : 'Please contact the administrator to update your account registration.')}</small>
      </div>
      {[['full_name', 'Full name'], ['nic', 'NIC number'], ['date_of_birth', 'Date of birth'], ['age', 'Age'], ['gender', 'Gender'], ['nationality', 'Nationality'], ['permanent_address', 'Permanent address'], ['contact_number', 'Contact number'], ['district', 'District'], ['divisional_secretariat', 'Divisional Secretariat'], ['email', 'Email address']].map(([k, n]) => (
        <label key={k}>
          {n}{['full_name', 'nic'].includes(k) ? ' (required)' : ''}
          {k === 'district' ? <select value={form.profile?.district || ''} onChange={e => setForm(current => ({ ...current, profile: { ...current.profile, district: e.target.value, divisional_secretariat: '' } }))} disabled={locationsLoading}><option value="">{locationsLoading ? 'Loading districts…' : 'Select district'}</option>{districts.map(district => <option key={district.id} value={district.district_name}>{district.district_name}</option>)}</select> : k === 'divisional_secretariat' ? <select value={form.profile?.divisional_secretariat || ''} onChange={e => field('profile', k, e.target.value)} disabled={!selectedDistrict}><option value="">{selectedDistrict ? 'Select divisional secretariat' : 'Select a district first'}</option>{divisionalSecretariats.map(division => <option key={division.id} value={division.ds_name}>{division.ds_name}</option>)}</select> : <input
            type={k === 'date_of_birth' ? 'date' : 'text'}
            value={form.profile?.[k] || ''}
            onChange={e => field('profile', k, e.target.value)}
          />}
        </label>
      ))}
    </div>
  );

  const employment = (
    <>
      <div className="grid employment-grid">
        {[['service_years', 'Service years'], ['service_months', 'Service months']].map(([k, n]) => (
          <label key={k}>
            {n}
            <input
              value={form.employment?.[k] || ''}
              onChange={e => field('employment', k, e.target.value)}
            />
          </label>
        ))}
        <div className="registration-record">
          <span>SLTDA registration number</span>
          <strong>{registrationLoading ? 'Loading registration...' : registrationError ? 'Registration unavailable' : registration?.sltda_registration_no || 'No registration number on file'}</strong>
          <small>Linked to your registered account.</small>
        </div>
        <fieldset className="social-security-field tourism-category-field">
          <legend>Tourism categories</legend>
          <p className="social-security-hint">Select all categories that apply.</p>
          <div className="checks">
            {tourismCategories.map(category => {
              const selected = (form.employment?.tourism_category_ids || []).map(Number).includes(Number(category.id));
              return <label key={category.id}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={categoriesLoading}
                  onChange={event => {
                    const current = (form.employment?.tourism_category_ids || []).map(Number);
                    const next = event.target.checked
                      ? [...new Set([...current, Number(category.id)])]
                      : current.filter(id => id !== Number(category.id));
                    field('employment', 'tourism_category_ids', next);
                  }}
                />
                {category.category_name}
              </label>;
            })}
          </div>
          {(form.employment?.tourism_category_ids || []).some(id => {
            const category = tourismCategories.find(item => Number(item.id) === Number(id));
            return category?.category_name.toLowerCase() === 'other';
          }) && <label className="other-security-details">
            Other category name
            <input
              value={form.employment?.other_category_name || ''}
              onChange={e => field('employment', 'other_category_name', e.target.value)}
              placeholder="Enter the other tourism category"
            />
          </label>}
        </fieldset>
        <fieldset className="social-security-field">
          <legend>Social security entitlements</legend>
          <p className="social-security-hint">Tick all applicable; must be unchecked to qualify.</p>
          <div className="checks">
            {[['epf', 'EPF'], ['etf', 'ETF'], ['government_pension', 'Government pension'], ['other_social_security', 'Other social security']].map(([k, n]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={!!form.socialSecurity?.[k]}
                  onChange={e => field('socialSecurity', k, e.target.checked)}
                />
                {n}
              </label>
            ))}
          </div>
          {form.socialSecurity?.other_social_security && <label className="other-security-details">
            Other details
            <input
              value={form.socialSecurity?.other_details || ''}
              onChange={e => field('socialSecurity', 'other_details', e.target.value)}
              placeholder="Specify the other entitlement"
            />
          </label>}
        </fieldset>
      </div>
    </>
  );

  const family = (
    <Repeat
      title="Family members"
      rows={form.family}
      setRows={family => setForm(current => ({ ...current, family }))}
      fields={['name', 'relationship', 'id_number', 'marital_status']}
    />
  );

  const pensionAmount = value => Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const beneficiary = (
    <>
      <div className="beneficiary-declaration" role="note">
        <p className="beneficiary-declaration-title">I hereby declare that:</p>
        <p>I have carefully read and understood the terms and conditions of the "Surekuma" Pension Scheme and willingly agree to make monthly contributions according to the selected plan. If any misconduct is found, I understand that I will not receive the SLTDA 40% contribution.</p>
        <p>In the event of my death, I nominate the following person(s) as my beneficiary/beneficiaries to receive any applicable benefits under the "Surekuma" Pension Scheme:</p>
      </div>
      <Repeat
        title="Beneficiaries"
        rows={form.beneficiaries}
        setRows={beneficiaries => setForm(current => ({ ...current, beneficiaries }))}
        fields={['full_name', 'relationship', 'id_number', 'contact_number']}
      />
      <section className="pension-selection" aria-labelledby="pension-selection-title">
        <header className="pension-selection-heading">
          <span className="pension-selection-icon" aria-hidden="true"><Icons.ShieldCheck /></span>
          <div>
            <h3 id="pension-selection-title">Your pension plan</h3>
            <p>Choose a scheme and set up your monthly contribution.</p>
          </div>
          <span className="pension-required">Required</span>
        </header>
        <div className="pension-selection-body">
          <div className="pension-selection-fields">
            <label className="scheme-select">
              Pension scheme <span className="pension-sr-only">(required)</span>
              <select
                aria-required="true"
                disabled={loading || schemes.length === 0}
                value={form.selection?.scheme_id || ''}
                onChange={e => field('selection', 'scheme_id', e.target.value)}
              >
                <option value="">{loading ? 'Loading schemes...' : schemes.length ? 'Choose your pension scheme' : 'No schemes available'}</option>
                {schemes.map(s => <option key={s.id} value={s.id}>{s.scheme_name} / Rs. {pensionAmount(s.monthly_contribution)} per month</option>)}
              </select>
            </label>
            <div className="grid scheme-details-grid">
              <label>
                Start month
                <div className={`pension-month-input${form.selection?.start_month ? '' : ' is-empty'}`}>
                  <input
                    aria-label="Start month"
                    type="month"
                    value={(form.selection?.start_month || '').slice(0, 7)}
                    onChange={e => field('selection', 'start_month', e.target.value ? `${e.target.value}-01` : '')}
                  />
                  {!form.selection?.start_month && <span aria-hidden="true">Select start month</span>}
                </div>
                <small>When you plan to begin contributing.</small>
              </label>
              <label>
                Monthly contribution
                <div className="pension-amount-input">
                  <span aria-hidden="true">Rs.</span>
                  <input
                    aria-label="Monthly contribution in Sri Lankan rupees"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.selection?.monthly_contribution ?? ''}
                    onChange={e => field('selection', 'monthly_contribution', e.target.value)}
                  />
                </div>
                <small>Amount in Sri Lankan rupees (LKR).</small>
              </label>
            </div>
          </div>
        </div>
        {!loading && schemes.length === 0 && <p className="pension-empty" role="status">No pension schemes are available. Please contact the administrator before submitting.</p>}
      </section>
    </>
  );

  const views = [personal, employment, family, beneficiary];

  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Build your application.</h1>
        <p className="hero-desc">Complete each section, save it as a draft, then submit when you are ready.</p>

        <div className="action-cards-grid action-cards-4">
          {stepsList.map((st, i) => {
            const StepIcon = st.icon;
            const isActive = step === i + 1;
            return (
              <button
                key={st.title}
                className={`task-action-card ${isActive ? 'active-step-card' : ''}`}
                onClick={() => moveToStep(i + 1)}
              >
                <div className="action-icon-badge">
                  <StepIcon />
                </div>
                <div className="action-card-text">
                  <strong>Step {i + 1}</strong>
                  <span>{st.title}</span>
                </div>
                <span className="action-card-arrow">{'>'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="panel form-panel">
        <h2>{stepsList[step - 1].title}</h2>
        <p role="status">
          Status: {label(applicationStatus)}. {canEdit
            ? 'Edit your details and click Continue or Save draft to save your changes. Submit when ready for review.'
            : 'This application is read-only. You can view each section using Continue.'}
        </p>
        {loading && <p className="notice">Loading application details</p>}
        <fieldset className="application-fields" disabled={loading || !canEdit}>
          {views[step - 1]}
        </fieldset>
        {note && <p className={`notice${note === 'Progress saved.' ? ' notice-success' : ''}`} role="status">{note}</p>}
        <div className="actions">
          {canEdit && <button className="text" disabled={loading} onClick={save}>Save draft</button>}
          <div className="application-step-navigation">
            {step > 1 && <button className="text" onClick={() => moveToStep(step - 1)}>Back</button>}
            {step < 4 ? (
              <button className="hero-search-btn" onClick={() => moveToStep(step + 1)}>Continue {'>'}</button>
            ) : (
              <button className="hero-search-btn" onClick={submit}>{canEdit ? 'Submit application >' : 'View documents >'}</button>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function Repeat({ title: heading, rows, setRows, fields }) {
  const update = (i, k, v) => setRows(rows.map((row, index) => index === i ? { ...row, [k]: v } : row));
  return (
    <div className="repeat">
      <h3>{heading}</h3>
      {rows.map((row, i) => (
        <div className="grid" key={i}>
          {fields.map(k => (
            <label key={k}>
              {label(k)}
              <input value={row[k] || ''} onChange={e => update(i, k, e.target.value)} />
            </label>
          ))}
        </div>
      ))}
      <button className="text" onClick={() => setRows([...rows, {}])}>+ Add another</button>
    </div>
  );
}

function Documents({ appId, apps, onSelect, onSubmitted }) {
  const [id, setId] = useState(appId || apps[0]?.id || '');
  const [type, setType] = useState('NIC');
  const [file, setFile] = useState();
  const [note, setNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef(null);
  const uploadInProgress = useRef(false);
  const [uploadedTypes, setUploadedTypes] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState('draft');
  const documentTypes = [
    { name: 'NIC', description: 'National Identity Card', icon: Icons.IdCard },
    { name: 'Birth Certificate', description: 'Birth certificate copy', icon: Icons.File },
    { name: 'Guide ID', description: 'Tourist guide identification', icon: Icons.User },
    { name: 'Other Documents', description: 'Additional supporting documents', icon: Icons.Clipboard },
  ];
  const isComplete = documentTypes.every(document => uploadedTypes.includes(document.name));
  const isApproved = applicationStatus === 'approved';
  const isSubmitted = applicationStatus === 'submitted';

  useEffect(() => {
    let active = true;
    setUploadedDocuments([]);
    setUploadedTypes([]);
    setFile(undefined);
    setNote('');
    setSuccess(false);
    setReviewing(false);
    setType('NIC');
    if (fileInput.current) fileInput.current.value = '';
    if (!id) { setDocumentsLoading(false); return () => { active = false; }; }
    setDocumentsLoading(true);
    api.get(`/applications/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const documents = data.documents || [];
        const types = [...new Set(documents.map(document => document.document_type))];
        setApplicationStatus(data.application.status);
        setUploadedDocuments(documents);
        setUploadedTypes(types);
        const next = ['NIC', 'Birth Certificate', 'Guide ID', 'Other Documents'].find(name => !types.includes(name));
        setType(next || 'NIC');
        setReviewing(!next || data.application.status === 'approved');
      })
      .catch(error => { if (active) setNote(message(error)); })
      .finally(() => { if (active) setDocumentsLoading(false); });
    return () => { active = false; };
  }, [id]);

  const chooseType = name => {
    setType(name);
    setReviewing(false);
    setFile(undefined);
    setNote('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const upload = async () => {
    if (uploadInProgress.current || documentsLoading) return;
    setSuccess(false);
    if (isApproved) return setNote('Approved applications cannot be changed.');
    if (!id || !file) return setNote('Choose an application and a file first.');
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) return setNote('Choose a PDF, JPG or PNG file no larger than 5 MB.');
    uploadInProgress.current = true;
    setBusy(true);
    const body = new FormData();
    body.append('document_type', type);
    body.append('file', file);
    try {
      const { data: uploadedDocument } = await api.post(`/documents/${id}`, body);
      setUploadedDocuments(current => [...current, uploadedDocument]);
      const nextTypes = [...new Set([...uploadedTypes, type])];
      setUploadedTypes(nextTypes);
      setFile(undefined);
      if (fileInput.current) fileInput.current.value = '';
      setSuccess(true);
      const next = documentTypes.find(document => !nextTypes.includes(document.name));
      if (next) {
        setType(next.name);
        setNote(`${type} uploaded successfully. Please upload ${next.name} next.`);
      } else {
        setReviewing(true);
        setNote('All document types uploaded. Review your saved documents below.');
      }
    } catch (e) {
      setNote(message(e));
    } finally {
      uploadInProgress.current = false;
      setBusy(false);
    }
  };

  const submitDocuments = async () => {
    if (busy || documentsLoading || !id || !isComplete || isApproved) return;
    setBusy(true);
    setSuccess(false);
    try {
      await api.post(`/applications/${id}/submit`);
      setApplicationStatus('submitted');
      setNote('Documents submitted successfully.');
      setSuccess(true);
      onSubmitted?.(id);
    } catch (e) {
      setNote(message(e));
    } finally {
      setBusy(false);
    }
  };


  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Keep your documents together.</h1>
        <p className="hero-desc">Upload PDF, JPG or PNG files up to 5 MB.</p>

        <div className="action-cards-grid action-cards-4">
          {documentTypes.map(({ name, description, icon: DocumentIcon }) => (
            <button key={name} className={`task-action-card ${!reviewing && type === name ? 'active-step-card' : ''}`} disabled={busy || documentsLoading || isApproved} onClick={() => chooseType(name)}>
              <div className="action-icon-badge"><DocumentIcon /></div>
              <div className="action-card-text"><strong>{name}</strong><span>{description}</span></div>
              <span className="action-card-arrow">{uploadedTypes.includes(name) ? '✓' : '>'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="document-view-switch" role="group" aria-label="Document view">
        <button type="button" className={!reviewing ? 'primary' : 'text'} disabled={busy || documentsLoading || isApproved} onClick={() => setReviewing(false)}>Upload documents</button>
        <button type="button" className={reviewing ? 'primary' : 'text'} disabled={busy || documentsLoading} onClick={() => { setReviewing(true); setNote(''); }}>Submit documents ({uploadedDocuments.length})</button>
      </div>
      <section className="panel upload upload-form">
        <div className="upload-form-heading">
          <div>
            <p className="upload-kicker">DOCUMENT SUBMISSION</p>
            <h2>{reviewing ? 'Submit documents' : 'Upload a supporting document'}</h2>
            <p>{reviewing ? 'Review all files saved for this application. Each upload is saved immediately.' : 'Upload each document separately. View all saved files in Submit documents.'}</p>
          </div>
          <span className="upload-file-rule">PDF, JPG or PNG · Max 5 MB</span>
        </div>
        <div className="upload-select-grid">
          <label className="upload-field">
            <span>Application</span>
            <select disabled={busy} value={id} onChange={e => { setId(e.target.value); onSelect(e.target.value); }}>
              <option value="">Choose application</option>
              {apps.map(a => <option key={a.id} value={a.id}>{a.application_no}</option>)}
            </select>
          </label>
          {!reviewing && <label className="upload-field">
            <span>Document type</span>
            <select disabled={busy || documentsLoading || isApproved} value={type} onChange={e => chooseType(e.target.value)}>
              {documentTypes.map(({ name }) => <option key={name}>{name}</option>)}
            </select>
          </label>}
        </div>
        {!reviewing && <label className={`upload-dropzone ${file ? 'has-file' : ''} ${isApproved ? 'upload-readonly' : ''}`}>
          <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={isApproved || busy || documentsLoading || !id} onChange={e => setFile(e.target.files[0])} />
          <span className="upload-dropzone-icon"><Icons.File /></span>
          <span className="upload-dropzone-copy">
            <strong>{file ? file.name : 'Choose a file or drag it here'}</strong>
            <small>{file ? `${Math.ceil(file.size / 1024)} KB ready to upload` : 'Accepted formats: PDF, JPG and PNG'}</small>
          </span>
          <span className="upload-browse-button">Browse files</span>
        </label>}
        {reviewing && uploadedDocuments.length > 0 && <div className="uploaded-document-list">
          <h3>All uploaded documents</h3>
          {uploadedDocuments.map(document => <p key={`${document.document_type}-${document.id || document.file_name}`}>
            <strong>{document.document_type}</strong>
            {document.file_path ? <a href={new URL(document.file_path, api.defaults.baseURL).href} target="_blank" rel="noreferrer">{document.file_name}</a> : <span>{document.file_name}</span>}
          </p>)}
        </div>}
        {documentsLoading && <p role="status">Loading documents...</p>}
        {reviewing && !documentsLoading && uploadedDocuments.length === 0 && <p>No documents uploaded for this application yet.</p>}
        {reviewing && !documentsLoading && !isComplete && <p className="upload-helper">Still needed: {documentTypes.filter(document => !uploadedTypes.includes(document.name)).map(document => document.name).join(', ')}.</p>}
        <div className="upload-form-footer">
          {note ? <p className={`notice${success ? ' notice-success' : ''}`} role="status">{note}</p> : <p className="upload-helper">{reviewing ? 'These files are saved and available with your application.' : 'Please ensure all document details are readable before uploading.'}</p>}
          {!reviewing && !isApproved && <button className="hero-search-btn" onClick={upload} disabled={busy || documentsLoading || !id || !file}>{busy ? 'Uploading...' : `Upload ${type} >`}</button>}
          {reviewing && !isApproved && !isSubmitted && <div className="upload-form-actions">
            <button className="hero-search-btn secondary-action" disabled={busy || documentsLoading} onClick={() => chooseType(documentTypes.find(document => !uploadedTypes.includes(document.name))?.name || 'Other Documents')}>Upload another document {'>'}</button>
            <button className="hero-search-btn" disabled={busy || documentsLoading || !isComplete} onClick={submitDocuments}>{busy ? 'Submitting...' : 'Submit documents >'}</button>
          </div>}
        </div>
      </section>
    </section>
  );
}

function Profile({ user }) {
  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Your account details.</h1>
        <p className="hero-desc">Your email and account role are managed by your administrator.</p>

        <div className="action-cards-grid">
          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.User />
            </div>
            <div className="action-card-text">
              <strong>Account email</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.ShieldCheck />
            </div>
            <div className="action-card-text">
              <strong>Account Role</strong>
              <span>{user.role === 'admin' ? 'SLTDA Officer (Admin)' : label(user.role)}</span>
            </div>
          </div>

          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.Lock />
            </div>
            <div className="action-card-text">
              <strong>Account status</strong>
              <span>Signed in</span>
            </div>
          </div>
        </div>
      </div>

      <section className="panel profile">
        <div className="avatar-large">{accountInitials(user)}</div>
        <h2>{user.role === 'admin' ? 'SLTDA Officer (Admin)' : label(user.role)} account</h2>
        <p>{user.email}</p>
        <span className="role-pill">{user.role === 'admin' ? 'SLTDA Officer (Admin)' : label(user.role)}</span>
      </section>
    </section>
  );
}

function Admin({ page, go }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setNote('');
    try {
      if (page === 'admin-dashboard') {
        const r = await api.get('/admin/dashboard');
        setSummary(r.data.summary || {});
        setData(r.data.recent || []);
      } else if (page === 'admin-applications') {
        const r = await api.get('/admin/applications');
        setData(r.data || []);
      } else if (['admin-memberships', 'admin-schemes', 'admin-users'].includes(page)) {
        const type = page.replace('admin-', '');
        const r = await api.get(`/admin/resources/${type}`);
        setData(r.data || []);
      } else if (page === 'admin-reports') {
        const r = await api.get('/admin/reports');
        setData(r.data.monthly || []);
      }
    } catch (e) {
      setNote(message(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      setNote('');
      try {
        if (page === 'admin-dashboard') {
          const r = await api.get('/admin/dashboard');
          if (isMounted) {
            setSummary(r.data.summary || {});
            setData(r.data.recent || []);
          }
        } else if (page === 'admin-applications') {
          const r = await api.get('/admin/applications');
          if (isMounted) setData(r.data || []);
        } else if (['admin-memberships', 'admin-schemes', 'admin-users'].includes(page)) {
          const type = page.replace('admin-', '');
          const r = await api.get(`/admin/resources/${type}`);
          if (isMounted) setData(r.data || []);
        } else if (page === 'admin-reports') {
          const r = await api.get('/admin/reports');
          if (isMounted) setData(r.data.monthly || []);
        }
      } catch (e) {
        if (isMounted) setNote(message(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    window.addEventListener('focus', fetchData);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', fetchData);
    };
  }, [page]);

  const open = async id => { try { const r = await api.get(`/admin/applications/${id}`); setSelected(r.data); go('admin-details') } catch (e) { setNote(message(e)) } };
  if (page === 'admin-details') { return <Review data={selected} back={() => go('admin-applications')} done={() => go('admin-applications')} /> };
  if (page === 'admin-reports') return <section className="content"><Intro eyebrow="REPORTS" title="Application activity." text="Applications created during the last six months." /><section className="panel chart">{data.length ? data.map(x => <article key={x.month}><i style={{ height: `${Math.max(10, x.total * 10)}px` }} /><span>{x.month}</span><b>{x.total}</b></article>) : <Empty text="No application activity is available yet." />}</section></section>;
  if (page === 'admin-schemes') return <Resource title="Pension schemes" text="Plans currently stored in the database." data={data} render={x => <><strong>{x.scheme_name}</strong><p>{x.duration_years} years . Rs. {x.monthly_contribution}/month</p><Status value={x.status} /></>} />;
  if (page === 'admin-memberships') return <Resource title="Memberships" text="Approved membership records." data={data} render={x => <><strong>{x.membership_id}</strong><p>{x.full_name} . {x.certificate_no}</p></>} />;
  if (page === 'admin-users') return <Resource title="Users" text="Registered Surekuma users." data={data} render={x => <><strong>{x.email}</strong><p>{label(x.role)}</p><Status value={x.status} /></>} />;
  if (page === 'admin-applications') return <Applications data={data} open={open} note={note} reload={load} />;

  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Overview at a glance.</h1>
        <p className="hero-desc">Applications awaiting review and current programme activity.</p>

        <div className="action-cards-grid">
          <button className="task-action-card" onClick={() => go('admin-applications')}>
            <div className="action-icon-badge">
              <Icons.File />
            </div>
            <div className="action-card-text">
              <strong>All applications</strong>
              <span>Review pending submissions</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button className="task-action-card" onClick={() => go('admin-schemes')}>
            <div className="action-icon-badge">
              <Icons.Layers />
            </div>
            <div className="action-card-text">
              <strong>Pension schemes</strong>
              <span>Manage active plans</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button className="task-action-card" onClick={() => go('admin-memberships')}>
            <div className="action-icon-badge">
              <Icons.Users />
            </div>
            <div className="action-card-text">
              <strong>Memberships</strong>
              <span>Approved membership records</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>
        </div>

        <div className="hero-search-row">
          <div className="search-input-wrapper">
            <span className="search-icon-inside"><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search name, NIC or application number"
              onKeyDown={e => { if (e.key === 'Enter') go('admin-applications'); }}
            />
          </div>
          <button className="hero-search-btn" onClick={() => go('admin-applications')}>
            Search applications
          </button>
        </div>
      </div>

      <div className="stats-grid-4">
        <article className="stat-card-clean">
          <div className="stat-card-head">
            <span>Total applications</span>
            <span className="stat-badge-icon slate"><Icons.File /></span>
          </div>
          <strong className="stat-card-number">{summary.total || 0}</strong>
          <p className="stat-card-sub">All submissions</p>
        </article>

        <article className="stat-card-clean">
          <div className="stat-card-head">
            <span>Submitted</span>
            <span className="stat-badge-icon peach"><Icons.Clipboard /></span>
          </div>
          <strong className="stat-card-number">{summary.submitted || 0}</strong>
          <p className="stat-card-sub">Pending assessment</p>
        </article>

        <article className="stat-card-clean">
          <div className="stat-card-head">
            <span>Under review</span>
            <span className="stat-badge-icon mint"><Icons.ShieldCheck /></span>
          </div>
          <strong className="stat-card-number">{summary.under_review || 0}</strong>
          <p className="stat-card-sub">Being assessed</p>
        </article>

        <article className="stat-card-clean">
          <div className="stat-card-head">
            <span>Corrections</span>
            <span className="stat-badge-icon amber"><Icons.Users /></span>
          </div>
          <strong className="stat-card-number">{summary.correction_required || 0}</strong>
          <p className="stat-card-sub">Correction required</p>
        </article>
      </div>

      {loading && <p className="notice">Loading dashboard data</p>}
      {note && <p className="notice">{note}</p>}
      <section className="panel">
        <h2>Recent applications</h2>
        <AdminRows data={data} open={open} />
      </section>
    </section>
  );
}
function Officer({ page, go }) {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (page === 'officer-details') return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/officer/applications');
        if (active) { setData(response.data); setNote(''); }
      } catch (error) { if (active) { setData([]); setNote(message(error)); } }
      finally { if (active) setLoading(false); }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [page, refresh]);
  const open = async id => {
    try {
      const response = await api.get(`/officer/applications/${id}`);
      setSelected(response.data);
      go('officer-details');
    } catch (error) { setNote(message(error)); }
  };
  if (page === 'officer-details') return <Review data={selected} readOnly back={() => go('officer-applications')} />;
  const filtered = data.filter(row => [row.full_name, row.nic, row.application_no].some(value => String(value || '').toLowerCase().includes(search.toLowerCase())));
  return <section className="content">
    <section className="hero-primary-task">
      <p className="eyebrow">INSURANCE COMPANY CONSOLE</p>
      <h1 className="hero-title">Approved applications.</h1>
      <p className="hero-desc">Applications appear here after Admin approval.</p>
      <div className="hero-search-row"><div className="search-input-wrapper"><span className="search-icon-inside"><Icons.Search /></span><input aria-label="Search approved applications" placeholder="Search name, NIC or application number" value={search} onChange={event => setSearch(event.target.value)} /></div></div>
    </section>
    <article className="stat-card-clean"><div className="stat-card-head"><span>Approved applications</span><Icons.ShieldCheck /></div><strong className="stat-card-number">{data.length}</strong><p className="stat-card-sub">Approved by Admin</p></article>
    <section className="panel"><h2>Approved applications</h2><button className="text" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh</button>
      {note && <p className="notice" role="alert">{note}</p>}
      {loading ? <p className="notice">Loading approved applications...</p> : <AdminRows data={filtered} open={open} readOnly />}
    </section>
  </section>;
}

function Resource({ title: heading, text, data, render }) { return <section className="content"><Intro eyebrow="ADMIN CONSOLE" title={heading} text={text} /><section className="panel resource">{data.length ? data.map(x => <article key={x.id}>{render(x)}</article>) : <Empty text={`No ${heading.toLowerCase()} found.`} />}</section></section> }

function Applications({ data, open, note }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filterRows, setFilterRows] = useState(null);

  const rows = filterRows ?? data;

  const filter = async () => {
    const r = await api.get('/admin/applications', { params: { search, status } });
    setFilterRows(r.data);
  };

  return <section className="content"><Intro eyebrow="APPLICATIONS" title="Review applications." text="Search, filter and open the complete applicant record." /><div className="filter"><input placeholder="Search name, NIC or application number" value={search} onChange={e => setSearch(e.target.value)} /><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['draft', 'submitted', 'under_review', 'correction_required', 'approved', 'rejected'].map(x => <option key={x} value={x}>{label(x)}</option>)}</select><button className="primary" onClick={filter}>Filter</button></div>{note && <p className="notice">{note}</p>}<section className="panel"><AdminRows data={rows} open={open} /></section></section>
}
function AdminRows({ data, open, readOnly = false }) { return data.length ? <div className="rows admin-rows">{data.map(x => <article key={x.id}><div><strong>{x.full_name || 'Incomplete draft'}</strong><p>{x.application_no} . {x.email || 'No email provided'}</p></div><span>{x.scheme_name || 'No scheme selected'}</span><Status value={x.status} /><button className="text" onClick={() => open(x.id)}>{readOnly ? 'View' : 'Review'} {'>'}</button></article>)}</div> : <Empty text="No applications found." /> }
function Review({ data, back, done, readOnly = false }) { const [action, setAction] = useState('approved'); const [comment, setComment] = useState(''); const [note, setNote] = useState(''); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [officer, setOfficer] = useState({ recommending_officer_name: '', recommending_designation: '', approving_designation: '' }); const [signature, setSignature] = useState(null); const submitting = useRef(false); if (!data) return <section className="content"><Empty text="Select an application to review." /></section>; const save = async () => { if (submitting.current || saved) return; submitting.current = true; setSaving(true); try { const payload = new FormData(); payload.append('action', action); payload.append('comment', comment); Object.entries(officer).forEach(([key, value]) => payload.append(key, value)); if (signature) payload.append('signature', signature); const response = await api.post(`/admin/applications/${data.application.id}/review`, payload); setNote(response.data.message); setSaved(true); } catch (e) { setNote(message(e)); } finally { submitting.current = false; setSaving(false); } }; const blocks = [['Applicant information', data.profile], ['Employment details', data.employment], ['Social security', data.socialSecurity], ['Pension scheme', data.selection]]; return <section className="content"><button className="text" onClick={back}> Back to applications</button><Intro eyebrow="APPLICATION REVIEW" title={data.application.application_no} text={`${data.profile?.full_name || 'Applicant'} . ${data.profile?.email || ''}`} /><div className="review-grid"><div>{blocks.map(([heading, obj]) => <section className="panel detail" key={heading}><h3>{heading}</h3>{obj ? Object.entries(obj).filter(([k]) => !['id', 'application_id', 'scheme_id'].includes(k)).map(([k, v]) => <p key={k}><b>{label(k)}</b><span>{String(v ?? '--')}</span></p>) : <p>No information saved.</p>}</section>)}<section className="panel detail"><h3>Uploaded documents</h3>{data.documents.length ? data.documents.map(d => <p key={d.id}><b>{d.document_type}</b><a href={`http://localhost:5000${d.file_path}`} target="_blank">{d.file_name}</a></p>) : <p>No documents uploaded.</p>}</section></div><section className="panel decision">{!readOnly && <><h3>Review decision</h3><label>Decision<select disabled={saving || saved} value={action} onChange={e => setAction(e.target.value)}><option value="approved">Approve</option><option value="correction_required">Request correction</option><option value="rejected">Reject</option></select></label><label>Response comment<textarea disabled={saving || saved} value={comment} onChange={e => setComment(e.target.value)} placeholder="Explain the decision or requested correction" /></label><fieldset className="review-officer-fields" disabled={saving || saved}>
<legend>SLTDA officer details</legend>
<label>Name of SLTDA recommending officer<input maxLength={200} value={officer.recommending_officer_name} onChange={e => setOfficer(current => ({ ...current, recommending_officer_name: e.target.value }))} placeholder="Enter officer name" /></label>
<label>Recommending officer designation<input maxLength={200} value={officer.recommending_designation} onChange={e => setOfficer(current => ({ ...current, recommending_designation: e.target.value }))} placeholder="Enter designation" /></label>
<label>Approving officer designation<input maxLength={200} value={officer.approving_designation} onChange={e => setOfficer(current => ({ ...current, approving_designation: e.target.value }))} placeholder="Enter designation" /></label>
<label>Signature of approving officer<input type="file" accept="image/png,image/jpeg" onChange={e => { const file = e.target.files?.[0]; if (file && (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024)) { setNote('Choose a PNG or JPG signature image, 2 MB or smaller.'); e.target.value = ''; setSignature(null); return; } setSignature(file || null); setNote(''); }} /><small>Browse a PNG or JPG signature image (maximum 2 MB).</small></label>
</fieldset>{note && <p className={`notice${saved ? ' notice-success' : ''}`} role="status">{note}</p>}<button className="primary" disabled={saving || saved || !comment.trim() || !['submitted', 'under_review'].includes(data.application.status)} onClick={save}>{saving ? 'Saving and sending email...' : saved ? 'Review saved' : 'Save review & notify applicant'}</button>{saved && <button className="text" onClick={done}>Back to applications</button>}</>}<h3>Saved officer details</h3>{(data.reviewOfficers || []).map(detail => <div className="review-officer-record" key={detail.review_id}><p><b>Recommending officer</b><span>{detail.recommending_officer_name || '--'}</span></p><p><b>Designation</b><span>{detail.recommending_designation || '--'}</span></p><p><b>Approving officer designation</b><span>{detail.approving_designation || '--'}</span></p>{detail.signature_image && <img src={detail.signature_image} alt="Approving officer signature" />}</div>)}{saved && <p className="review-officer-saved">Officer details saved with this review. Reopen the application to view the saved signature.</p>}<h3>Review history</h3>{data.reviews.length ? data.reviews.map(x => <p key={x.id}><Status value={x.action} /> {x.comment}</p>) : <p>No previous reviews.</p>}</section></div></section> }

function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(() => !!localStorage.getItem('surekuma_token'));
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const go = next => setPage(next);
  const logout = () => {
    localStorage.removeItem('surekuma_token');
    localStorage.removeItem('surekuma_user');
    setUser(null);
    setSessionError('');
    go('home');
  };
  const login = account => {
    setUser(account);
    go(account.role === 'admin' ? 'admin-dashboard' : account.role === 'insurance_officer' ? 'officer-dashboard' : 'application');
  };

  useEffect(() => {
    if (!localStorage.getItem('surekuma_token')) return;
    let active = true;
    api.get('/auth/me').then(({ data }) => {
      if (!active) return;
      if (!['admin', 'applicant', 'insurance_officer'].includes(data.user.role)) {
        localStorage.removeItem('surekuma_token');
        localStorage.removeItem('surekuma_user');
        return;
      }
      localStorage.setItem('surekuma_user', JSON.stringify(data.user));
      setUser(data.user);
      setPage(data.user.role === 'admin' ? 'admin-dashboard' : data.user.role === 'insurance_officer' ? 'officer-dashboard' : 'application');
    }).catch(error => {
      if (!active) return;
      if ([401, 403].includes(error.response?.status)) {
        localStorage.removeItem('surekuma_token');
        localStorage.removeItem('surekuma_user');
      } else {
        setSessionError('We could not connect to your account. Please try again.');
      }
    }).finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [sessionAttempt]);

  if (checkingSession || sessionError) return <main className="public-session" aria-live="polite">
    <img src="/company-logo.png" alt="SLTDA" width="64" height="64" />
    <h1>{checkingSession ? 'Opening your Surekuma account…' : 'Let’s reconnect.'}</h1>
    {sessionError && <><p>{sessionError}</p><button onClick={() => { setCheckingSession(true); setSessionError(''); setSessionAttempt(value => value + 1); }}>Try again</button><button onClick={logout}>Back to home</button></>}
  </main>;
  if (user) return <Shell user={user} page={page} go={go} logout={logout}>
    {user.role === 'admin' ? <Admin page={page} go={go} /> : user.role === 'insurance_officer' ? <Officer page={page} go={go} /> : <Applicant user={user} page={page} go={go} />}
  </Shell>;
  return <PublicExperience page={page} go={go} onLogin={login} />;
}
export default App
