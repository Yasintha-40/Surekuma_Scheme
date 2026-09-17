import { useEffect, useState } from 'react'
import api from './services/api'
import './App.css'

const label = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
const message = (error) => error.response?.data?.message || 'Unable to complete that request.'
const Status = ({ value }) => <span className={`status ${value}`}>{label(value)}</span>

function PublicNav({ go }) {
  return (
    <header className="public-nav tourpension-nav">
      <button className="tourpension-brand" onClick={() => go('home')}>
        <div className="tourpension-logo-mark">
          <svg viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M20 2 31 11v16c0 8-4.8 14.3-11 18-6.2-3.7-11-10-11-18V11L20 2Z" fill="#d9a13a" stroke="#fff1bd" strokeWidth="1.5"/>
            <path d="M20 7 27 13v13c0 5.2-2.8 9.6-7 12.5-4.2-2.9-7-7.3-7-12.5V13l7-6Z" fill="#9d3124" stroke="#f6d77d"/>
            <circle cx="20" cy="20" r="5.2" fill="#f2c46e"/>
            <path d="M15 30h10M13 33h14M17 36h6" stroke="#fff1bd" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="tourpension-brand-text">
          <span className="tourpension-name">Surekuma</span>
          <span className="tourpension-sub">SLTP</span>
        </div>
      </button>
      <nav>
        {[['about','About'],['schemes','Scheme Details'],['home','Benefits'],['eligibility','Eligibility'],['about','Contact']].map(([id,name]) =>
          <button key={name} onClick={() => go(id)}>{name}</button>
        )}
      </nav>
      <div className="tourpension-nav-ctas">
        <button className="text tourpension-signin" onClick={() => go('login')}>Sign In</button>
        <button className="tourpension-apply-btn" onClick={() => go('register')}>Apply Now</button>
      </div>
    </header>
  );
}

function Public({ page, go }) {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (page !== 'schemes') return;
      setLoading(true); setError('');
      try {
        const r = await api.get('/applications/schemes');
        if (isMounted) setSchemes(r.data);
      } catch (e) {
        if (isMounted) setError(message(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [page]);

  if (page === 'home') return (
    <div className="tourpension-home">
      {/* -- HERO -- */}
      <section className="tourpension-hero">
        <div className="tourpension-hero-bg">
          <img src="/beach_bg.jpg" alt="Sri Lanka tropical beach at golden sunset" className="tourpension-hero-img" />
          <div className="tourpension-hero-overlay"></div>
          <div className="tourpension-hero-gradient"></div>
        </div>

        <div className="tourpension-hero-content">
          <div className="tourpension-hero-left">
            <div className="tourpension-kicker">
              <span className="tourpension-kicker-line"></span>
              <span>SRI LANKA TOURISM DEVELOPMENT AUTHORITY</span>
              <span className="tourpension-kicker-line"></span>
            </div>

            <h1 className="tourpension-hero-h1">
              SUREKUMA
            </h1>

            <h2 className="tourpension-hero-title">Sri Lanka Tourism Department<br />Pension Scheme</h2>

            <p className="tourpension-hero-desc">
              Securing your future in retirement after a dedicated<br className="desktop-break" /> career in Sri Lanka's vibrant tourism industry.
            </p>

            <div className="tourpension-hero-btns">
              <button className="tourpension-cta-primary" onClick={() => go('register')}>
                <span>Learn More</span>
              </button>
              <button className="tourpension-cta-ghost" onClick={() => go('register')}>
                Apply Now
              </button>
            </div>
          </div>

          <div className="tourpension-hero-right">
            <div className="tourpension-photo-card">
              <div className="tourpension-photo-frame">
                <img
                  src="/pension_hero.jpg"
                  alt="Retired Sri Lankan couple enjoying their pension"
                  className="tourpension-photo"
                />
                <div className="tourpension-photo-inner-overlay"></div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom scroll hint */}
        <div className="tourpension-scroll-hint">
          <div className="tourpension-scroll-mouse"><div className="tourpension-scroll-dot"></div></div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* -- BENEFITS STRIP -- */}
      <section className="tourpension-strip">
        <div className="tourpension-strip-inner">
          {[
            { icon: '', label: 'Government Backed', desc: 'Fully regulated by SLTDA' },
            { icon: '', label: 'Flexible Terms', desc: '5, 10, 15 & 20-year plans' },
            { icon: '', label: 'Monthly Pension', desc: 'Guaranteed lifetime income' },
            { icon: '', label: 'Family Protected', desc: 'Nominee benefit on death' },
            { icon: '', label: '100% Digital', desc: 'Apply online anytime' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="tourpension-strip-item">
              <span className="tourpension-strip-icon">{icon}</span>
              <div>
                <strong>{label}</strong>
                <span>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="tourpension-signin-section">
        <div className="tourpension-signin-content">
          <div>
            <p className="tourpension-signin-eyebrow">MEMBER PORTAL</p>
            <h2>Already a Surekuma member?</h2>
            <p>Sign in to manage your pension application, documents, and account details.</p>
          </div>
          <button className="tourpension-signin-cta" onClick={() => go('login')}>Sign In</button>
        </div>
      </section>
    </div>
  );

  if (page === 'schemes') return (
    <div className="tourpension-page-wrap">
      <div className="tourpension-page-hero">
        <div className="tourpension-page-hero-bg" style={{ backgroundImage: 'url(/beach_bg.jpg)' }}></div>
        <div className="tourpension-page-hero-overlay"></div>
        <div className="tourpension-page-hero-content">
          <div className="tourpension-section-label">PENSION SCHEMES</div>
          <h1>Choose the right plan<br /><em>for your future.</em></h1>
          <p>Select from our government-backed contribution schemes designed to match your income and retirement goals.</p>
        </div>
      </div>
      <div className="tourpension-schemes-body">
        {loading && <p className="notice">Loading schemes</p>}
        {error && <p className="notice">{error}</p>}
        <div className="tourpension-schemes-grid">
          {schemes.length ? schemes.map((s, i) => (
            <article key={s.id} className={`tourpension-scheme-card ${i === 1 ? 'featured' : ''}`}>
              {i === 1 && <div className="tourpension-scheme-badge">Most Popular</div>}
              <div className="tourpension-scheme-duration">{s.duration_years} Year Plan</div>
              <h2>{s.scheme_name}</h2>
              <p>{s.description || 'A secure contribution plan providing a dignified retirement income for tourism professionals.'}</p>
              <div className="tourpension-scheme-amount">
                <strong>Rs. {Number(s.monthly_contribution).toLocaleString()}</strong>
                <span>/ month</span>
              </div>
              <button className="tourpension-scheme-btn" onClick={() => go('register')}>
                Apply for This Scheme {'>'}
              </button>
            </article>
          )) : (!loading && <Empty text="No active pension schemes are currently available." />)}
        </div>
      </div>
    </div>
  );

  const pageData = {
    about: {
      kicker: 'ABOUT SUREKUMA',
      h1: 'A pension scheme built\nfor those who built\n',
      h1em: 'Sri Lanka\'s tourism.',
      body: 'Surekuma was established by the Sri Lanka Tourism Development Authority to ensure that every worker in the tourism sector -- from hotel housekeeping to tour guides -- has access to a dignified, Government-backed retirement pension. We believe that a lifetime of service to Sri Lanka\'s tourism industry deserves a secure future.',
    },
    eligibility: {
      kicker: 'ELIGIBILITY CRITERIA',
      h1: 'Find out if you\nqualify for the\n',
      h1em: 'Surekuma scheme.',
      body: 'To be eligible, you must be employed in a Sri Lanka Tourism Development Authority (SLTDA) registered establishment, hold a valid NIC, and be between 18 and 55 years of age. You should have completed at least 6 months of continuous service and be willing to make regular monthly contributions to the chosen plan.',
    },
  };
  const pd = pageData[page] || pageData.about;

  return (
    <div className="tourpension-page-wrap">
      <div className="tourpension-page-hero">
        <div className="tourpension-page-hero-bg" style={{ backgroundImage: 'url(/beach_bg.jpg)' }}></div>
        <div className="tourpension-page-hero-overlay"></div>
        <div className="tourpension-page-hero-content">
          <div className="tourpension-section-label">{pd.kicker}</div>
          <h1>{pd.h1}<em>{pd.h1em}</em></h1>
        </div>
      </div>
      <div className="tourpension-info-body">
        <p>{pd.body}</p>
        <button className="tourpension-cta-primary" onClick={() => go('register')}>
          <span>Get started</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}
function Intro({ eyebrow, title, text }) { return <div className="intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div> }
function Empty({ text }) { return <div className="empty"><span></span><p>{text}</p></div> }

const Icons = {
  Grid: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  Scan: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Clipboard: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  File: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  User: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Help: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ShieldCheck: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  IdCard: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="2"/><line x1="13" y1="14" x2="18" y2="14"/><line x1="13" y1="17" x2="16" y2="17"/></svg>,
  Passport: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="11" r="3"/><line x1="7" y1="18" x2="17" y2="18"/></svg>,
  Camera: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Layers: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  BarChart: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
};

function Auth({ mode, go, onLogin }) {
  const [form, setForm] = useState({ full_name: '', email: '', otp: '' });
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const admin = mode === 'admin-login';
  const register = mode === 'register';
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const cooldown = seconds => {
    setNow(Date.now());
    setRetryAt(Date.now() + seconds * 1000);
  };
  const showError = error => {
    setNote(error.response?.data?.message || error.message);
    if (error.response?.data?.retryAfter) cooldown(error.response.data.retryAfter);
  };
  const sendCode = async () => {
    const { data } = await api.post('/auth/send-otp', { email: form.email });
    setSent(true);
    setForm(previous => ({ ...previous, otp: '' }));
    cooldown(data.retryAfter || 60);
    setNote(data.message);
  };
  const resend = async () => {
    setLoading(true);
    setNote('');
    try { await sendCode(); } catch (error) { showError(error); }
    finally { setLoading(false); }
  };
  const submit = async event => {
    event.preventDefault();
    setLoading(true);
    setNote('');
    try {
      if (register) {
        await api.post('/auth/register', { full_name: form.full_name, email: form.email });
        setNote('Account created. Select Sign in to request your email verification code.');
      } else if (!sent) {
        await sendCode();
      } else {
        const { data } = await api.post('/auth/verify-otp', { email: form.email, otp: form.otp });
        if (admin && data.user.role !== 'admin') throw new Error('This account does not have administrator access. Please use member sign in.');
        localStorage.setItem('surekuma_token', data.token);
        localStorage.setItem('surekuma_user', JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch (error) { showError(error); }
    finally { setLoading(false); }
  };
  return <main className={`auth auth-${mode}`}>
    <section className="auth-story">
      <div className="auth-story-image" aria-hidden="true"></div>
      <button className="brand inverse" onClick={() => go('home')} aria-label="Go to Surekuma home"><b>S</b><span>SUREKUMA<small>MEMBER PORTAL</small></span></button>
      <div className="auth-story-photo" aria-hidden="true"><img src="/beach_bg.jpg" alt="" /></div>
    </section>
    <section className="auth-form">
      <button className="back" onClick={() => go('home')}>← Back to website</button>
      <form onSubmit={submit}>
        <p className="eyebrow">{admin ? 'ADMIN LOGIN' : register ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p>
        <h2>{admin ? 'Administrator sign in' : register ? 'Start your application' : 'Sign in to Surekuma'}</h2>
        {register && <label>Full name<input autoComplete="name" required maxLength={150} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>}
        <label>Email address<input type="email" autoComplete="email" required maxLength={150} readOnly={sent || loading} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        {sent && <>
          <p>Enter the verification code sent to {form.email}. The code expires in 5 minutes.</p>
          <label>Verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="6-digit code" value={form.otp} onChange={e => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })} /></label>
        </>}
        {note && <p className="notice" role="status" aria-live="polite">{note}</p>}
        <button className="primary" disabled={loading || (!sent && !register && remaining > 0)}>
          {loading ? 'Please wait…' : register ? 'Create account →' : sent ? 'Verify OTP →' : remaining > 0 ? `Try again in ${remaining}s` : 'Send OTP →'}
        </button>
        {sent && <>
          <button className="text" type="button" disabled={loading || remaining > 0} onClick={resend}>{remaining > 0 ? `Resend OTP in ${remaining}s` : 'Resend OTP'}</button>
          <button className="text" type="button" disabled={loading} onClick={() => { setSent(false); setForm({ ...form, otp: '' }); setNote(''); }}>Change email address</button>
        </>}
        {!admin && <p>{register ? 'Already registered?' : 'New to Surekuma?'} <button className="text" type="button" disabled={loading} onClick={() => go(register ? 'login' : 'register')}>{register ? 'Sign in' : 'Create an account'}</button></p>}
        <button className="text admin-link" type="button" disabled={loading} onClick={() => go(admin ? 'login' : 'admin-login')}>{admin ? 'Member sign in →' : 'Administrator access →'}</button>
      </form>
    </section>
  </main>
}
const applicantLinks = [
  ['dashboard', Icons.Grid, 'Overview'],
  ['application', Icons.Scan, 'Application form'],
  ['documents', Icons.File, 'Document upload'],
  ['status', Icons.Clipboard, 'Application status'],
  ['profile', Icons.User, 'Profile'],
  ['notifications', Icons.Bell, 'Notifications']
];

const adminLinks = [
  ['admin-dashboard', Icons.Grid, 'Dashboard'],
  ['admin-applications', Icons.File, 'All applications'],
  ['admin-memberships', Icons.Users, 'Memberships'],
  ['admin-schemes', Icons.Layers, 'Pension schemes'],
  ['admin-reports', Icons.BarChart, 'Reports'],
  ['admin-users', Icons.User, 'Users'],
  ['admin-settings', Icons.Settings, 'Settings']
];

function Sidebar({ admin, page, go, logout }) {
  const links = admin ? adminLinks : applicantLinks;
  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={() => go(links[0][0])}>
        <div className="emblem-box">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 3.3l6 3.33v4.47c0 4.1-2.6 7.9-6 9.07-3.4-1.17-6-4.97-6-9.07V8.63l6-3.33zm-1 5.7h2v5h-2zm0-3h2v2h-2z" />
          </svg>
        </div>
        <div className="brand-text-block">
          <span className="authority-subtitle">SRI LANKA TOURISM DEVELOPMENT AUTHORITY</span>
          <span className="system-title">SUREKUMA</span>
        </div>
      </div>
      <p className="workspace-label">{admin ? 'ADMIN CONSOLE' : 'APPLICANT PORTAL'}</p>
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
    'notifications': ['Notifications', 'Important application updates'],
    'admin-dashboard': ['Dashboard', 'Applications awaiting review and current programme activity'],
    'admin-applications': ['Applications', 'Review applications and records'],
    'admin-memberships': ['Memberships', 'Approved membership records'],
    'admin-schemes': ['Pension Schemes', 'Plans currently stored in the database'],
    'admin-reports': ['Reports', 'Application activity and statistics'],
    'admin-users': ['Users', 'Registered Surekuma users'],
    'admin-settings': ['Settings', 'System preferences and configuration'],
    'admin-details': ['Application Review', 'Examine applicant details and submit decision']
  };

  const [title, subtitle] = pageMeta[page] || ['Dashboard', 'Overview at a glance'];

  return (
    <main className="shell">
      <Sidebar admin={user.role === 'admin'} page={page} go={go} logout={logout} />
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
            <button className="icon-bell-btn" onClick={() => go(user.role === 'admin' ? 'admin-dashboard' : 'notifications')} title="Notifications">
              <Icons.Bell />
              <span className="bell-dot"></span>
            </button>
            <div className="user-profile-pill">
              <span className="avatar-initials">{user.full_name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}</span>
              <div className="user-meta">
                <strong>{user.full_name}</strong>
                <small>{label(user.role)}</small>
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
  }, []);

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

  if (page === 'application') return <ApplicationForm appId={selected} onCreated={setSelected} go={go} />;
  if (page === 'documents') return <Documents appId={selected} apps={apps} onSelect={setSelected} />;
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
        <AppList apps={filteredApps} select={setSelected} />
      </section>
    </section>
  );
  if (page === 'notifications') return <Notifications />;
  if (page === 'profile') return <Profile user={user} />;

  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Hello, {user.full_name.split(' ')[0]}.</h1>
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

          <button className="task-action-card" onClick={() => go('documents')}>
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
        <AppList apps={filteredApps} select={setSelected} />
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

const registrationCategories = ['Homestay', 'Bungalow', 'Tourist Hotels', 'Rented Apartment', 'Tourist Guide Lecturers', 'Travel Agents', 'Tourist Driver', 'Other Category'];

function ApplicationForm({ appId, onCreated, go }) {
  const [id, setId] = useState(appId);
  const [form, setForm] = useState({ profile: {}, employment: {}, socialSecurity: {}, selection: {}, family: [{}], beneficiaries: [{}] });
  const [schemes, setSchemes] = useState([]);
  const [step, setStep] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
            setForm({
              ...appRes.data,
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

  const field = (group, key, value) => setForm({ ...form, [group]: { ...form[group], [key]: value } });
  const validateCategory = (required = true) => {
    const { registrationCategory, otherRegistrationCategory } = form.employment || {};
    let error = '';
    if (!registrationCategory && required) error = 'Please select your registration category.';
    else if (registrationCategory && !registrationCategories.includes(registrationCategory)) error = 'Please select a valid registration category.';
    else if (registrationCategory === 'Other Category' && !otherRegistrationCategory?.trim()) error = 'Please specify your category.';
    else if (registrationCategory === 'Other Category' && otherRegistrationCategory.trim().length > 150) error = 'Your category must be 150 characters or fewer.';
    if (error) { setNote(error); setStep(2); return false; }
    return true;
  };
  const save = async () => {
    if (!validateCategory(false)) return null;
    try {
      let current = id;
      if (!current) {
        const { data } = await api.post('/applications');
        current = data.application.id;
      }
      await api.put(`/applications/${current}`, {
        ...form,
        employment: {
          ...form.employment,
          registrationCategory: form.employment?.registrationCategory || null,
          otherRegistrationCategory: form.employment?.registrationCategory === 'Other Category'
            ? form.employment.otherRegistrationCategory.trim() : null,
        },
      });
      if (!id) { setId(current); onCreated(current); }
      setNote('Draft saved successfully.');
      return current;
    } catch (e) {
      setNote(message(e));
      return null;
    }
  };
  const submit = async () => {
    if (!validateCategory()) return;
    const current = await save();
    if (!current) return;
    try {
      await api.post(`/applications/${current}/submit`);
      setNote('Application submitted successfully.');
      go('status');
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
      {[['full_name','Full name (as per NIC)'],['nic','NIC number'],['date_of_birth','Date of birth'],['age','Age'],['gender','Gender'],['nationality','Nationality'],['permanent_address','Permanent address'],['contact_number','Contact number'],['email','Email address']].map(([k,n]) => (
        <label key={k}>
          {n}
          <input
            type={k === 'date_of_birth' ? 'date' : 'text'}
            value={form.profile?.[k] || ''}
            onChange={e => field('profile', k, e.target.value)}
          />
        </label>
      ))}
    </div>
  );

  const employment = (
    <>
      <div className="grid">
        {[['service_years','Service years'],['service_months','Service months'],['sltda_registration_no','SLTDA registration number']].map(([k,n]) => (
          <label key={k}>
            {n}
            <input
              value={form.employment?.[k] || ''}
              onChange={e => field('employment', k, e.target.value)}
            />
          </label>
        ))}
        <div className="registration-category">
          <label>
            Registration Category
            <select required value={form.employment?.registrationCategory || ''}
              onChange={e => {
                const registrationCategory = e.target.value;
                setForm(previous => ({ ...previous, employment: {
                  ...previous.employment, registrationCategory, otherRegistrationCategory: null,
                } }));
                setNote('');
              }}>
              <option value="">Select your registration category</option>
              {registrationCategories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          {form.employment?.registrationCategory === 'Other Category' && (
            <label>
              Please specify your category
              <input required maxLength={150} value={form.employment.otherRegistrationCategory || ''}
                onChange={e => field('employment', 'otherRegistrationCategory', e.target.value)} />
            </label>
          )}
        </div>
      </div>
      <div className="checks">
        {[['epf','EPF'],['etf','ETF'],['government_pension','Government pension'],['other_social_security','Other social security']].map(([k,n]) => (
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
    </>
  );

  const family = (
    <Repeat
      title="Family members"
      rows={form.family}
      setRows={family => setForm({ ...form, family })}
      fields={['name','relationship','id_number','marital_status']}
    />
  );

  const beneficiary = (
    <>
      <Repeat
        title="Beneficiaries"
        rows={form.beneficiaries}
        setRows={beneficiaries => setForm({ ...form, beneficiaries })}
        fields={['full_name','relationship','id_number','contact_number']}
      />
      <label className="scheme-select">
        Pension scheme
        <select
          value={form.selection?.scheme_id || ''}
          onChange={e => field('selection', 'scheme_id', e.target.value)}
        >
          <option value="">Choose a scheme</option>
          {schemes.map(s => (
            <option key={s.id} value={s.id}>
              {s.scheme_name} -- Rs. {s.monthly_contribution}
            </option>
          ))}
        </select>
      </label>
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
                onClick={() => setStep(i + 1)}
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
        {loading && <p className="notice">Loading application details</p>}
        {views[step - 1]}
        {note && <p className="notice">{note}</p>}
        <div className="actions">
          <button className="text" onClick={save}>Save draft</button>
          <div>
            {step > 1 && <button className="text" onClick={() => setStep(step - 1)}>Back</button>}
            {step < 4 ? (
              <button className="hero-search-btn" onClick={() => { if (step !== 2 || validateCategory()) { setNote(''); setStep(step + 1); } }}>Continue {'>'}</button>
            ) : (
              <button className="hero-search-btn" onClick={submit}>Submit application {'>'}</button>
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

function Documents({ appId, apps, onSelect }) {
  const [id, setId] = useState(appId || apps[0]?.id || '');
  const [type, setType] = useState('National Identity Card');
  const [file, setFile] = useState();
  const [note, setNote] = useState('');

  const upload = async () => {
    if (!id || !file) return setNote('Choose an application and a file first.');
    const body = new FormData();
    body.append('document_type', type);
    body.append('file', file);
    try {
      await api.post(`/documents/${id}`, body);
      setNote('Document uploaded successfully.');
    } catch (e) {
      setNote(message(e));
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

        <div className="action-cards-grid">
          <button
            className={`task-action-card ${type === 'National Identity Card' ? 'active-step-card' : ''}`}
            onClick={() => setType('National Identity Card')}
          >
            <div className="action-icon-badge">
              <Icons.IdCard />
            </div>
            <div className="action-card-text">
              <strong>Upload NIC</strong>
              <span>National Identity card</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button
            className={`task-action-card ${type === 'Proof of employment' ? 'active-step-card' : ''}`}
            onClick={() => setType('Proof of employment')}
          >
            <div className="action-icon-badge">
              <Icons.File />
            </div>
            <div className="action-card-text">
              <strong>Upload Passport</strong>
              <span>Passport information page</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>

          <button
            className={`task-action-card ${type === 'Recent photograph' ? 'active-step-card' : ''}`}
            onClick={() => setType('Recent photograph')}
          >
            <div className="action-icon-badge">
              <Icons.Camera />
            </div>
            <div className="action-card-text">
              <strong>Capture Document</strong>
              <span>Use the device camera</span>
            </div>
            <span className="action-card-arrow">{'>'}</span>
          </button>
        </div>
      </div>

      <section className="panel upload">
        <label>
          Application
          <select value={id} onChange={e => { setId(e.target.value); onSelect(e.target.value); }}>
            <option value="">Choose application</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.application_no}</option>)}
          </select>
        </label>
        <label>
          Document type
          <select value={type} onChange={e => setType(e.target.value)}>
            <option>National Identity Card</option>
            <option>Proof of employment</option>
            <option>Recent photograph</option>
          </select>
        </label>
        <label className="drop">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} />
          <b></b>{file ? file.name : 'Choose a file to upload'}
        </label>
        {note && <p className="notice">{note}</p>}
        <button className="hero-search-btn" onClick={upload}>Upload document {'>'}</button>
      </section>
    </section>
  );
}

function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const r = await api.get('/notifications');
        if (isMounted) setItems(r.data);
      } catch (e) {
        if (isMounted) setError(message(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const read = id => api.patch(`/notifications/${id}/read`).then(() => setItems(items.map(x => x.id === id ? { ...x, is_read: 1 } : x)));

  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <section className="content">
      <div className="hero-primary-task">
        <div className="eyebrow-badge">
          <span className="gold-dash"></span> PRIMARY TASK
        </div>
        <h1 className="hero-title">Updates that matter.</h1>
        <p className="hero-desc">Important application updates appear here.</p>

        <div className="action-cards-grid">
          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.Bell />
            </div>
            <div className="action-card-text">
              <strong>Total notifications</strong>
              <span>{items.length} records</span>
            </div>
          </div>

          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.Clipboard />
            </div>
            <div className="action-card-text">
              <strong>Unread updates</strong>
              <span>{unreadCount} pending</span>
            </div>
          </div>

          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.ShieldCheck />
            </div>
            <div className="action-card-text">
              <strong>System alerts</strong>
              <span>Protected feed</span>
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="notice">Loading notifications</p>}
      {error && <p className="notice">{error}</p>}
      <section className="panel notifications">
        {items.length ? (
          items.map(n => (
            <article className={!n.is_read ? 'unread' : ''} key={n.id} onClick={() => read(n.id)}>
              <b></b>
              <div>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </div>
            </article>
          ))
        ) : (
          !loading && <Empty text="You have no notifications." />
        )}
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
        <p className="hero-desc">Your name and email are managed securely with your account.</p>

        <div className="action-cards-grid">
          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.User />
            </div>
            <div className="action-card-text">
              <strong>{user.full_name}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.ShieldCheck />
            </div>
            <div className="action-card-text">
              <strong>Account Role</strong>
              <span>{label(user.role)}</span>
            </div>
          </div>

          <div className="task-action-card">
            <div className="action-icon-badge">
              <Icons.Lock />
            </div>
            <div className="action-card-text">
              <strong>Session Security</strong>
              <span>Authorized &amp; encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <section className="panel profile">
        <div className="avatar-large">{user.full_name.slice(0, 2).toUpperCase()}</div>
        <h2>{user.full_name}</h2>
        <p>{user.email}</p>
        <span className="role-pill">{label(user.role)}</span>
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

    return () => {
      isMounted = false;
    };
  }, [page]);

  const open=async id=>{try{const r=await api.get(`/admin/applications/${id}`);setSelected(r.data);go('admin-details')}catch(e){setNote(message(e))}};
  if(page==='admin-details'){return <Review data={selected} back={()=>go('admin-applications')} done={()=>go('admin-applications')}/>};
  if(page==='admin-settings')return <section className="content"><Intro eyebrow="SETTINGS" title="System settings" text="System preferences are controlled by the Surekuma administrator."/><section className="panel"><p>Notification delivery and application settings are available through the configured backend services.</p></section></section>;
  if(page==='admin-reports')return <section className="content"><Intro eyebrow="REPORTS" title="Application activity." text="Applications created during the last six months."/><section className="panel chart">{data.length?data.map(x=><article key={x.month}><i style={{height:`${Math.max(10,x.total*10)}px`}}/><span>{x.month}</span><b>{x.total}</b></article>):<Empty text="No application activity is available yet."/>}</section></section>;
  if(page==='admin-schemes')return <Resource title="Pension schemes" text="Plans currently stored in the database." data={data} render={x=><><strong>{x.scheme_name}</strong><p>{x.duration_years} years . Rs. {x.monthly_contribution}/month</p><Status value={x.status}/></>}/>;
  if(page==='admin-memberships')return <Resource title="Memberships" text="Approved membership records." data={data} render={x=><><strong>{x.membership_id}</strong><p>{x.full_name} . {x.certificate_no}</p></>}/>;
  if(page==='admin-users')return <Resource title="Users" text="Registered Surekuma users." data={data} render={x=><><strong>{x.full_name}</strong><p>{x.email} . {label(x.role)}</p><Status value={x.status}/></>}/>;
  if(page==='admin-applications')return <Applications data={data} open={open} note={note} reload={load}/>;

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
        <AdminRows data={data} open={open}/>
      </section>
    </section>
  );
}
function Resource({title:heading,text,data,render}){return <section className="content"><Intro eyebrow="ADMIN CONSOLE" title={heading} text={text}/><section className="panel resource">{data.length?data.map(x=><article key={x.id}>{render(x)}</article>):<Empty text={`No ${heading.toLowerCase()} found.`}/>}</section></section>}

function Applications({ data, open, note }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filterRows, setFilterRows] = useState(null);

  const rows = filterRows ?? data;

  const filter = async () => {
    const r = await api.get('/admin/applications', { params: { search, status } });
    setFilterRows(r.data);
  };

  return <section className="content"><Intro eyebrow="APPLICATIONS" title="Review applications." text="Search, filter and open the complete applicant record."/><div className="filter"><input placeholder="Search name, NIC or application number" value={search} onChange={e=>setSearch(e.target.value)}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['draft','submitted','under_review','correction_required','approved','rejected'].map(x=><option key={x} value={x}>{label(x)}</option>)}</select><button className="primary" onClick={filter}>Filter</button></div>{note&&<p className="notice">{note}</p>}<section className="panel"><AdminRows data={rows} open={open}/></section></section>
}
function AdminRows({data,open}){return data.length?<div className="rows admin-rows">{data.map(x=><article key={x.id}><div><strong>{x.full_name||'Incomplete draft'}</strong><p>{x.application_no} . {x.email||'No email provided'}</p></div><span>{x.scheme_name||'No scheme selected'}</span><Status value={x.status}/><button className="text" onClick={()=>open(x.id)}>Review {'>'}</button></article>)}</div>:<Empty text="No applications found."/>}
function Review({data,back,done}){const [action,setAction]=useState('approved');const [comment,setComment]=useState('');const [note,setNote]=useState('');if(!data)return <section className="content"><Empty text="Select an application to review."/></section>;const save=async()=>{try{await api.post(`/admin/applications/${data.application.id}/review`,{action,comment});setNote('Review saved and applicant notified.');setTimeout(done,500)}catch(e){setNote(message(e))}};const blocks=[['Applicant information',data.profile],['Employment details',data.employment],['Social security',data.socialSecurity],['Pension scheme',data.selection]];return <section className="content"><button className="text" onClick={back}> Back to applications</button><Intro eyebrow="APPLICATION REVIEW" title={data.application.application_no} text={`${data.profile?.full_name||'Applicant'} . ${data.profile?.email||''}`}/><div className="review-grid"><div>{blocks.map(([heading,obj])=><section className="panel detail" key={heading}><h3>{heading}</h3>{obj?Object.entries(obj).filter(([k])=>!['id','application_id','scheme_id'].includes(k)).map(([k,v])=><p key={k}><b>{label(k)}</b><span>{String(v??'--')}</span></p>):<p>No information saved.</p>}</section>)}<section className="panel detail"><h3>Uploaded documents</h3>{data.documents.length?data.documents.map(d=><p key={d.id}><b>{d.document_type}</b><a href={`http://localhost:5000${d.file_path}`} target="_blank">{d.file_name}</a></p>):<p>No documents uploaded.</p>}</section></div><section className="panel decision"><h3>Review decision</h3><label>Decision<select value={action} onChange={e=>setAction(e.target.value)}><option value="approved">Approve</option><option value="correction_required">Request correction</option><option value="rejected">Reject</option></select></label><label>Response comment<textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Explain the decision or requested correction"/></label>{note&&<p className="notice">{note}</p>}<button className="primary" onClick={save}>Save review & notify applicant</button><h3>Review history</h3>{data.reviews.length?data.reviews.map(x=><p key={x.id}><Status value={x.action}/> {x.comment}</p>):<p>No previous reviews.</p>}</section></div></section>}

function App(){const [page,setPage]=useState('home');const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('surekuma_user'))}catch{return null}});const go=next=>setPage(next);const logout=()=>{localStorage.clear();setUser(null);go('home')};const login=u=>{setUser(u);go(u.role==='admin'?'admin-dashboard':'dashboard')};if(['login','register','admin-login'].includes(page))return <Auth key={page} mode={page} go={go} onLogin={login}/>;if(user)return <Shell user={user} page={page} go={go} logout={logout}>{user.role==='admin'?<Admin page={page} go={go}/>:<Applicant user={user} page={page} go={go}/>}</Shell>;return <><PublicNav go={go}/><Public page={page} go={go}/><footer> 2026 Surekuma Social Security Fund</footer></>}
export default App
