import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import './PublicExperience.css'
import './HomeHero.css'
import './LoginExperience.css'

function Arrow({ back = false }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" className={back ? 'entry-arrow entry-arrow-back' : 'entry-arrow'}><path d="M4 12h16M13 5l7 7-7 7" /></svg>
}

function Brand({ go, home = false }) {
  return <button className="entry-brand" onClick={() => go('home')} aria-label="Surekuma home">
    <img src="/company-logo.png" alt="" width="54" height="54" />
    <span><strong>{home ? 'Surekuma' : <>SUREKUMA<span className="entry-brand-dot">.</span></>}</strong><small>{home ? 'SLTP' : 'SRI LANKA TOURISM DEVELOPMENT AUTHORITY'}</small></span>
  </button>
}

// Small pointer/scroll offsets give the photographs depth without moving the controls.
function usePhotoParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--photo-x', `${motion.matches ? 0 : x}px`);
        element.style.setProperty('--photo-y', `${motion.matches ? 0 : y + Math.min(window.scrollY * 0.05, 12)}px`);
      });
    };
    const move = event => {
      if (!pointer.matches || motion.matches) return;
      const box = element.getBoundingClientRect();
      x = ((event.clientX - box.left) / box.width - 0.5) * 16;
      y = ((event.clientY - box.top) / box.height - 0.5) * 16;
      render();
    };
    const reset = () => { x = 0; y = 0; render(); };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', reset);
    window.addEventListener('scroll', render, { passive: true });
    motion.addEventListener('change', reset);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
      window.removeEventListener('scroll', render);
      motion.removeEventListener('change', reset);
    };
  }, []);
  return ref;
}

function Photograph({ login = false }) {
  return <div className={`entry-photograph ${login ? 'entry-photograph-login' : ''}`}>
    <img className="entry-photo" src={login ? '/pension-family.png' : '/ella-bridge.jpg'}
      alt={login ? 'Family spending time together with an elderly family member' : 'A blue train crossing Nine Arches Bridge surrounded by lush green hills in Ella, Sri Lanka'}
      fetchPriority="high" />
    <div className="entry-photo-shade" />
    {!login && <>
      <span className="entry-photo-tag"><span /> INSPIRED BY OUR ISLAND</span>
      <div className="entry-photo-caption"><span>THE JOURNEY CONTINUES</span><p>There’s more<br />to look forward to.</p></div>
      <div className="entry-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg> Ella, Sri Lanka</div>
      <a className="entry-photo-credit" href="https://unsplash.com/photos/BS8a67PahbM" target="_blank" rel="noreferrer">Photo: gemmafjam / Unsplash ↗</a>
    </>}
  </div>
}

function LoginForm({ onLogin }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const submitting = useRef(false);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresIn]);

  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleRequestOtp = async event => {
    if (event) event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/auth/otp/request', { email: email.trim() });
      setChallengeId(data.challengeId);
      setResendCooldown(data.retryAfter || 60);
      setExpiresIn(data.expiresIn || 600);
      setStep(2);
      setCode('');
      setNotice(`A 6-digit verification code was sent to ${email.trim()}`);
    } catch (requestError) {
      if (requestError.response?.status === 429) {
        setResendCooldown(requestError.response.data.retryAfter || 60);
      }
      const serverMessage = requestError.response?.data?.message;
      setError(serverMessage || (requestError.request
        ? 'Cannot reach the Surekuma server. Start the backend and try again.'
        : 'Unable to send verification code. Please try again.'));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleVerifyOtp = async event => {
    event.preventDefault();
    if (submitting.current) return;
    if (code.trim().length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/otp/verify', {
        email: email.trim(),
        challengeId,
        code: code.trim(),
      });
      localStorage.setItem('surekuma_token', data.token);
      localStorage.setItem('surekuma_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (step === 1) {
    return <form className="entry-login-form" onSubmit={handleRequestOtp} aria-busy={loading}>
      <div className="entry-welcome-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
      </div>
      <div className="login-progress" aria-label="Step 1 of 2"><span className="is-current">01 &nbsp; Email address</span><i /><span>02 &nbsp; Verify code</span></div><p className="entry-eyebrow">YOUR SUREKUMA ACCOUNT</p>
      <h1>Welcome back<span className="login-heading-dot">.</span></h1>
      <p className="entry-description">Enter your LRRS registered email or staff account email. We will send you a verification code to sign in.</p>
      <label htmlFor="entry-email">Email address</label>
      <div className="entry-email-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
        <input id="entry-email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={150} placeholder="name@example.com" required value={email} onChange={event => { setEmail(event.target.value); setError(''); }} disabled={loading} aria-invalid={!!error} aria-describedby={error ? 'entry-login-error entry-login-help' : 'entry-login-help'} />
      </div>
      {error && <p className="entry-error" id="entry-login-error" role="alert">{error}</p>}
      <button className="entry-primary entry-login-submit" disabled={loading} type="submit">
        <span>{loading ? 'Opening your account…' : 'Send verification code'}</span>
        {loading ? <span className="entry-spinner" aria-hidden="true" /> : <Arrow />}
      </button>
      <p id="entry-login-help" className="entry-login-help">No password needed. Just your email and a one-time code.</p>
      <div className="entry-login-support"><span className="entry-support-dot" /><p>Need access?<br /><span>Contact your SLTDA administrator.</span></p></div>
    </form>;
  }

  return <form className="entry-login-form" onSubmit={handleVerifyOtp} aria-busy={loading}>
    <div className="entry-steps-indicator">
      <div className="step-badge done">
        <span className="step-num">✓</span>
        <span className="step-text">Email</span>
      </div>
      <div className="step-divider" />
      <div className="step-badge active">
        <span className="step-num">2</span>
        <span className="step-text">Verify OTP</span>
      </div>
    </div>
    <div className="entry-welcome-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    </div>
    <p className="entry-eyebrow">STEP 2 OF 2 · SECURITY VERIFICATION</p>
    <h1>Enter your<br /><em>verification code.</em></h1>
    <p className="entry-description">
      We sent a 6-digit code to:
      <br /><span className="entry-email-badge">{email}</span>
    </p>
    {notice && <p className="entry-notice" role="status">{notice}</p>}
    <div className="entry-otp-header">
      <label htmlFor="entry-otp">6-Digit Code</label>
      {expiresIn > 0 ? <span className="entry-timer-pill">Expires in {formatTime(expiresIn)}</span> : <span className="entry-timer-pill entry-timer-expired">Code expired</span>}
    </div>
    <div className="entry-otp-wrap">
      <input
        ref={otpInputRef}
        id="entry-otp"
        name="otp"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        required
        value={code}
        onChange={event => {
          setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
          setError('');
        }}
        onPaste={event => {
          event.preventDefault();
          const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
          if (pasted) {
            setCode(pasted);
            setError('');
          }
        }}
        disabled={loading}
        aria-invalid={!!error}
        aria-describedby={error ? 'entry-login-error' : undefined}
        className="entry-otp-input"
      />
    </div>
    {error && <p className="entry-error" id="entry-login-error" role="alert">{error}</p>}
    <button className="entry-primary entry-login-submit" disabled={loading || code.length !== 6 || expiresIn <= 0} type="submit">
      <span>{loading ? 'Verifying code…' : 'Verify & sign in'}</span>
      {loading ? <span className="entry-spinner" aria-hidden="true" /> : <Arrow />}
    </button>
    <div className="entry-otp-actions">
      <button type="button" className="entry-ghost-btn" disabled={loading || resendCooldown > 0} onClick={handleRequestOtp}>
        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
      </button>
      <button type="button" className="entry-ghost-btn entry-change-email" disabled={loading} onClick={() => { setStep(1); setCode(''); setError(''); setNotice(''); }}>
        ← Use a different email address
      </button>
    </div>
    <div className="entry-login-support"><span className="entry-support-dot" /><p>Didn’t receive the code?<br /><span>Check your spam folder or click resend after the timer.</span></p></div>
  </form>;
}



function PensionSchemes({ onClose, go }) {
  const dialogRef = useRef(null);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/applications/schemes', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setSchemes(data); })
      .catch(() => { if (!controller.signal.aborted) setError('We could not load the pension schemes. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <dialog ref={dialogRef} className="entry-schemes-dialog" aria-labelledby="entry-schemes-title" onCancel={onClose}>
    <div className="entry-schemes-heading">
      <div><p className="entry-eyebrow">PLAN YOUR NEXT CHAPTER</p><h2 id="entry-schemes-title">Explore pension schemes</h2></div>
      <button className="entry-schemes-close" onClick={onClose} aria-label="Close pension schemes">×</button>
    </div>
    <div aria-live="polite">
      {loading && <p className="entry-schemes-state">Loading available schemes…</p>}
      {error && <div className="entry-schemes-state"><p role="alert">{error}</p><button className="entry-primary" onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1); }}>Try again</button></div>}
      {!loading && !error && (schemes.length ? <div className="entry-schemes-list">{schemes.map(scheme => <article key={scheme.id}>
        <span className="entry-scheme-duration">{scheme.duration_years} year plan</span>
        <h3>{scheme.scheme_name}</h3>
        {scheme.description && <p>{scheme.description}</p>}
        <div className="entry-scheme-price"><strong>Rs. {Number(scheme.monthly_contribution).toLocaleString('en-LK')}</strong><span> / month</span></div>
        <button className="entry-primary" onClick={() => { onClose(); go('login'); }}>Sign in to apply <Arrow /></button>
      </article>)}</div> : <p className="entry-schemes-state">There are no active pension schemes available at the moment.</p>)}
    </div>
  </dialog>
}

function HomeHero({ go, explore }) {
  return (
    <>
      <div className="pension-hero-wrap">
        <section className="pension-welcome" id="home-about" aria-labelledby="entry-home-title">
          <div className="pension-welcome-copy">
            <h1 id="entry-home-title">
              <span>SUREKUMA</span>
              <span>Sri Lanka Tourism</span>
              <span>Department</span>
              <em>Pension Scheme</em>
            </h1>
            <p className="pension-welcome-description">
              Securing your future in retirement after a dedicated career in Sri Lanka's vibrant tourism industry.
            </p>
            <div className="pension-welcome-actions">
              <button className="pension-btn-gold" onClick={explore}>Learn More</button>
              <button className="pension-btn-outline" onClick={() => go('login')}>Apply Now</button>
            </div>
          </div>
          <div className="pension-welcome-circle">
            <div className="pension-circle-frame">
              <img src="/pension_hero.jpg" alt="Sri Lanka tourism professionals enjoying financial security" fetchPriority="high" />
            </div>
          </div>
        </section>
      </div>

      <div className="hero-features-bar" id="home-benefits">
        <div className="hero-features-inner">
          <div className="feature-col">
            <strong className="feature-col-title">Government Backed</strong>
            <span className="feature-col-sub">Fully regulated by SLTDA</span>
          </div>
          <div className="feature-col">
            <strong className="feature-col-title">Flexible Terms</strong>
            <span className="feature-col-sub">5, 10, 15 & 20-year plans</span>
          </div>
          <div className="feature-col">
            <strong className="feature-col-title">Monthly Pension</strong>
            <span className="feature-col-sub">Guaranteed lifetime income</span>
          </div>
          <div className="feature-col">
            <strong className="feature-col-title">Family Protected</strong>
            <span className="feature-col-sub">Nominee benefit on death</span>
          </div>
          <div className="feature-col feature-col-last">
            <strong className="feature-col-title">100% Digital</strong>
            <span className="feature-col-sub">Apply online anytime</span>
          </div>
        </div>
      </div>

      <section className="home-portal-section" id="home-contact">
        <div className="member-portal-card">
          <div className="member-portal-content">
            <span className="member-portal-eyebrow">MEMBER PORTAL</span>
            <h2 className="member-portal-title">Already a Surekuma member?</h2>
            <p className="member-portal-desc">
              Sign in to manage your pension application, documents, and account details.
            </p>
          </div>
          <button className="member-portal-btn" onClick={() => go('login')}>
            Sign In
          </button>
        </div>
      </section>
    </>
  );
}

export default function PublicExperience({ page, go, onLogin }) {
  const login = page === 'login';
  const stageRef = usePhotoParallax();
  const [showSchemes, setShowSchemes] = useState(false);
  useEffect(() => {
    document.title = login ? 'Sign in · Surekuma' : 'Surekuma · Your next chapter';
  }, [login]);
  return <main className={`entry ${login ? 'entry-is-login' : 'entry-is-home'}`} ref={stageRef}>
    <header className="entry-header">
      <Brand go={go} home={!login} />
      {!login && (
        <nav className="home-nav" aria-label="Homepage navigation">
          <button onClick={() => document.getElementById('home-about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
          <button onClick={() => setShowSchemes(true)}>Scheme Details</button>
          <button onClick={() => document.getElementById('home-benefits')?.scrollIntoView({ behavior: 'smooth' })}>Benefits</button>
          <button onClick={() => document.getElementById('home-about')?.scrollIntoView({ behavior: 'smooth' })}>Eligibility</button>
          <button onClick={() => document.getElementById('home-contact')?.scrollIntoView({ behavior: 'smooth' })}>Contact</button>
        </nav>
      )}
      {login && (
        <button className="entry-nav-button" onClick={() => go('home')}>
          <Arrow back />
          <span>Back to home</span>
        </button>
      )}
    </header>

    {login ? <section className="entry-login-stage" key="login" aria-label="Sign in to Surekuma">
      <Photograph login />
      <div className="entry-login-side"><LoginForm onLogin={onLogin} /><span className="entry-login-signature">SUREKUMA <span>—</span> MADE FOR YOUR TOMORROW</span></div>
    </section> : <HomeHero go={go} explore={() => setShowSchemes(true)} />}
    {!login ? (
      <footer className="home-clean-footer">
        <p>2026 Surekuma Social Security Fund</p>
      </footer>
    ) : (
      <div className="entry-footnote" role="contentinfo">
        <span>© {new Date().getFullYear()} Surekuma · SLTDA</span>
        <span>For the people behind every journey.<span className="entry-footnote-mark" aria-hidden="true">✳</span></span>
      </div>
    )}
    {showSchemes && <PensionSchemes onClose={() => setShowSchemes(false)} go={go} />}
  </main>;
}
