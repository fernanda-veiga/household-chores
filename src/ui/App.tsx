import { useEffect, useRef } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { StorageRuntime } from '../application/storage/port';
import { LocalDataPage } from './pages/LocalDataPage';

function HomeMark() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><path d="m6 15 10-9 10 9v12H6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M13 27V17h6v10" stroke="currentColor" strokeWidth="2"/></svg>;
}

function HomeIllustration() {
  return (
    <svg className="home-illustration" viewBox="0 0 430 340" aria-hidden="true" fill="none">
      <circle cx="231" cy="168" r="137" fill="#E8EBDD" />
      <path d="M54 283h329" stroke="#A8B5A1" strokeWidth="2" strokeLinecap="round" />
      <path d="m111 152 108-85 108 85v130H111Z" fill="#FAF8EF" stroke="#758773" strokeWidth="2" strokeLinejoin="round" />
      <path d="m92 153 127-101 127 101" stroke="#365D47" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M193 282v-87h51v87" fill="#D4DCBE" stroke="#758773" strokeWidth="2" />
      <circle cx="231" cy="240" r="3" fill="#365D47" />
      <rect x="139" y="174" width="31" height="39" rx="3" fill="#ECD5AF" stroke="#758773" strokeWidth="2" />
      <path d="M155 175v37m-15-18h29" stroke="#758773" strokeWidth="2" />
      <rect x="271" y="174" width="31" height="39" rx="3" fill="#ECD5AF" stroke="#758773" strokeWidth="2" />
      <path d="M287 175v37m-15-18h29" stroke="#758773" strokeWidth="2" />
      <path d="M65 245v38m0-12c-23-2-27-18-25-29 16 0 25 11 25 29Zm1-15c0-22 9-35 23-36 6 19-3 34-23 36Z" fill="#769775" stroke="#4C7555" strokeWidth="2" />
      <path d="M350 258v25m0-8c-18-4-20-16-17-24 12 1 18 10 17 24Zm1-8c-2-17 4-28 15-31 7 13 2 26-15 31Z" fill="#9DAC7D" stroke="#648560" strokeWidth="2" />
      <circle cx="321" cy="69" r="20" fill="#E7B778" />
      <path d="m193 119 9-7m17 2 9 7" stroke="#365D47" strokeWidth="2" strokeLinecap="round" />
      <path d="M196 282h46" stroke="#365D47" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Home() {
  return (
    <>
      <section className="welcome" aria-labelledby="page-title">
        <div className="welcome-copy">
          <p className="eyebrow"><span className="small-spark" aria-hidden="true">✳</span> A little more together</p>
          <h1 id="page-title" tabIndex={-1}>A calmer home,<br /><span>one day at a time.</span></h1>
          <p className="welcome-description">A thoughtful place for the little things that keep a household running.</p>
          <Link className="button button-primary" to="/about">See how it works <span aria-hidden="true">↗</span></Link>
          <p className="quiet-note">No account needed. <Link to="/local-data">Set up local household</Link></p>
        </div>
        <div className="illustration-wrap"><HomeIllustration /><span className="illustration-caption">Room for a little less to remember.</span></div>
      </section>
      <section className="preview-section" aria-labelledby="preview-title">
        <div className="section-heading"><div><p className="eyebrow">The space we’re making</p><h2 id="preview-title">Everyday things, in one place.</h2></div><span className="status-label">Early preview</span></div>
        <div className="feature-grid">
          <article className="feature"><span className="feature-number">01</span><h3>A clearer week</h3><p>A calendar for chores, working days, and a realistic amount to do.</p></article>
          <article className="feature"><span className="feature-number">02</span><h3>A place for everyone</h3><p>See what belongs to each person, with everyone’s availability in mind.</p></article>
          <article className="feature"><span className="feature-number">03</span><h3>A little flexibility</h3><p>Plans that can adjust when life doesn’t follow the calendar.</p></article>
        </div>
        <p className="preview-disclosure">Chore setup and scheduling are coming next. Local household storage and backups are ready.</p>
      </section>
    </>
  );
}

function About() {
  return (
    <section className="information-page" aria-labelledby="page-title">
      <p className="eyebrow">A simple beginning</p>
      <h1 id="page-title" tabIndex={-1}>Your home, at your pace.</h1>
      <p className="page-lead">Our Home starts with a website you can use without setting up an account.</p>
      <div className="information-grid">
        <article><span className="info-icon" aria-hidden="true">⌂</span><h2>First, on this device</h2><p>Local household saving and JSON export/restore work in this browser. The chore calendar and daily workflows are coming next.</p></article>
        <article><span className="info-icon" aria-hidden="true">↗</span><h2>Shared access comes later</h2><p>Accounts and live sharing between people or devices will be added after the local app is complete. Choosing a person will be a local preference, not a sign-in.</p></article>
        <article><span className="info-icon" aria-hidden="true">✓</span><h2>You stay in control</h2><p>Daily chore messages will be reviewed before copying or opening WhatsApp. Nothing will be sent automatically.</p></article>
      </div>
      <Link className="button button-secondary" to="/">Back to home</Link>
    </section>
  );
}

function NotFound() {
  return <section className="information-page" aria-labelledby="page-title"><p className="eyebrow">A little off course</p><h1 id="page-title" tabIndex={-1}>This page isn’t here.</h1><p className="page-lead">Let’s take you back to a familiar place.</p><Link className="button button-primary" to="/">Back to home</Link></section>;
}

function RouteAccessibility() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const title = pathname === '/' ? 'A little more together' : pathname === '/about' ? 'About local mode' : pathname === '/local-data' ? 'Your local household' : 'Page not found';
    document.title = `Our Home · ${title}`;
    if (previousPath.current !== pathname) document.getElementById('page-title')?.focus();
    previousPath.current = pathname;
  }, [pathname]);
  return null;
}

export function App({ storage }: { storage?: StorageRuntime }) {
  return (
    <ErrorBoundary>
      <RouteAccessibility />
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
      <div className="app-frame">
        <header className="site-header">
          <Link className="wordmark" to="/" aria-label="Our Home home"><span className="logo-mark"><HomeMark /></span>Our Home<span className="wordmark-dot">.</span></Link>
          <nav aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><NavLink to="/about">About</NavLink><NavLink to="/local-data">Local data</NavLink></nav>
          <span className="local-label"><span aria-hidden="true" /> Frontend preview</span>
        </header>
        <main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/local-data" element={<LocalDataPage runtime={storage} />} /><Route path="*" element={<NotFound />} /></Routes></main>
        <footer className="site-footer"><span>Made for the everyday.</span><span>A little order. A little breathing room.</span></footer>
      </div>
    </ErrorBoundary>
  );
}
