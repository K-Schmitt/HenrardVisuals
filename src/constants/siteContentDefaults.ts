/**
 * Defaults and validators for operator-editable site content.
 *
 * These phrases used to live in `src/i18n`. They moved here because they are
 * editorial — they say something about Tristan and what he offers — and the
 * admin panel now owns them. Interface chrome stayed behind in i18n: an empty
 * translation there would strip a control of its accessible name, which is a
 * different class of mistake from an empty tagline.
 *
 * The values below are what the site shipped with, so a database with no
 * `site_copy` row renders exactly as before rather than blank.
 */

import type { ContactDetails, LocalisedText, SiteCopy } from '@/types';

export const DEFAULT_SITE_COPY: SiteCopy = {
  heroAvailability: {
    fr: "Paris — disponible à l'international",
    en: 'Paris — available internationally',
  },
  heroSpecsTitle: { fr: 'Fiche technique', en: 'Measurements' },
  // The newline is deliberate: the block is set on two lines, and where it
  // breaks is an editorial call, not a width accident.
  contactLead: {
    fr: 'Pour un casting,\nun essayage, un book.',
    en: 'For a casting, a fitting,\na book.',
  },
  contactBase: { fr: 'Paris, FR', en: 'Paris, FR' },
  contactTagline: { fr: 'Travaillons ensemble', en: "Let's work together" },
  contactDescription: {
    fr: "Pour toute demande de collaboration, projet photographique ou booking, n'hésitez pas à me contacter.",
    en: 'For any collaboration request, photography project, or booking inquiry, feel free to reach out.',
  },
  contactResponseTime: { fr: 'Réponse sous 24-48h', en: 'Response within 24-48h' },
  footerSignature: {
    fr: "L'essentiel, sans démonstration",
    en: 'The essential, without demonstration',
  },
  footerTagline: {
    fr: "L'essentiel, sans démonstration - l'image au service de l'art.",
    en: 'The essential, without demonstration - the image at the service of art.',
  },
};

export const DEFAULT_CONTACT_DETAILS: ContactDetails = {
  email: 'henrard.tristan@proton.me',
  instagram: 'https://www.instagram.com/dyavol_litso',
  linkedin: 'https://www.linkedin.com/in/tristan-henrard-2688a6198/',
};

/** Every field the admin form renders, in the order it renders them. */
export const SITE_COPY_FIELDS = Object.keys(DEFAULT_SITE_COPY) as (keyof SiteCopy)[];

const isLocalisedText = (v: unknown): v is LocalisedText => {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return typeof t['fr'] === 'string' && (t['en'] === undefined || typeof t['en'] === 'string');
};

/**
 * Merges a stored value over the defaults field by field. A partial or
 * malformed row degrades to the shipped copy for the fields it gets wrong
 * instead of blanking the whole site, which matters because this row is
 * hand-edited through the panel.
 */
export function mergeSiteCopy(raw: unknown): SiteCopy {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SITE_COPY;
  const stored = raw as Record<string, unknown>;

  const merged = { ...DEFAULT_SITE_COPY };
  for (const field of SITE_COPY_FIELDS) {
    const value = stored[field];
    // A blank French value is treated as "not set": the panel cannot be used
    // to erase a phrase into nothing, only to replace it.
    if (isLocalisedText(value) && value.fr.trim() !== '') merged[field] = value;
  }
  return merged;
}

/** Picks the locale, falling back to French when the English half is blank. */
export function resolveText(text: LocalisedText, language: string): string {
  if (language === 'en' && text.en && text.en.trim() !== '') return text.en;
  return text.fr;
}

export function mergeContactDetails(email: unknown, links: unknown): ContactDetails {
  const merged = { ...DEFAULT_CONTACT_DETAILS };

  if (typeof email === 'string' && email.trim() !== '') merged.email = email.trim();

  if (typeof links === 'object' && links !== null) {
    const stored = links as Record<string, unknown>;
    for (const key of ['instagram', 'linkedin'] as const) {
      const value = stored[key];
      if (typeof value === 'string' && value.trim() !== '') merged[key] = value.trim();
    }
  }

  return merged;
}
