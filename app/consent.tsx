import {useEffect} from 'react';
import {CONSENT_COOKIE,CONSENT_MAX_AGE,GTM_ID} from './config';

export type ConsentChoice = 'accepted' | 'rejected';

export function readConsent(): ConsentChoice | null {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + CONSENT_COOKIE + '=([^;]*)'));
  const v = m ? decodeURIComponent(m[1]) : '';
  return v === 'accepted' || v === 'rejected' ? v : null;
}

function writeConsent(choice: ConsentChoice) {
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax`;
}

/** Inject the GTM container. Called only after the visitor accepts statistics cookies. */
export function loadGtm() {
  if (!GTM_ID || document.getElementById('atlas-gtm')) return;
  const w = window as unknown as Record<string, unknown>;
  w.dataLayer = w.dataLayer || [];
  (w.dataLayer as unknown[]).push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.id = 'atlas-gtm';
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
  document.head.appendChild(s);
}

export function acceptConsent() {
  writeConsent('accepted');
  loadGtm();
}

export function rejectConsent() {
  writeConsent('rejected');
}

/** Reopen the banner from the footer "Cookie settings" link. */
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent('atlas:open-cookie-settings'));
}

/** Launch-day exception (Dennis, 2026-10-25): the banner is switched off
 * and GTM loads for every visitor, consent or not. The consent helpers
 * below stay exported for a later return to consent gating. */
export default function ConsentBanner() {
  useEffect(() => { loadGtm(); }, []);
  return null;
}
