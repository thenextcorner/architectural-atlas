import {readConsent} from './consent';

/**
 * Consent-gated analytics events, pushed to the GTM dataLayer.
 * Planned event names: building_view, explode_interaction, component_search,
 * component_select, system_toggle, coffee_click, personal_site_click,
 * detail_toggle. Events fire only after the visitor accepts statistics cookies.
 */
export function trackEvent(name: string, params: Record<string, string> = {}) {
  if (readConsent() !== 'accepted') return;
  const w = window as unknown as Record<string, unknown>;
  w.dataLayer = w.dataLayer || [];
  (w.dataLayer as unknown[]).push({event: name, ...params});
}
