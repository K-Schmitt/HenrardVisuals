import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_CONTACT_DETAILS,
  DEFAULT_SITE_COPY,
  SITE_COPY_FIELDS,
} from '@/constants/siteContentDefaults';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteContent } from '@/context/SiteContentContext';
import { typedFrom } from '@/lib/supabase';
import type { ContactDetails, SiteCopy, SiteCopyField } from '@/types';

/** Fields whose copy runs to more than one line get a textarea. */
const MULTILINE: ReadonlySet<SiteCopyField> = new Set([
  'contactLead',
  'contactDescription',
  'footerTagline',
]);

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

// Deliberately loose. Address syntax is far more permissive than the usual
// regex admits, and the cost of a false rejection here is an operator who
// cannot save a valid address.
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const FIELD_CLASS =
  'w-full px-3 py-2 bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-black transition-colors';

export function SiteContentSettings() {
  const { t } = useLanguage();
  const { copy, contact, isLoading, refresh } = useSiteContent();

  const [draftCopy, setDraftCopy] = useState<SiteCopy>(copy);
  const [draftContact, setDraftContact] = useState<ContactDetails>(contact);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactDetails, string>>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // The provider fetches asynchronously; adopt its values once they land, but
  // never afterwards or a save would stomp on what is being typed.
  const adopted = useRef(false);
  useEffect(() => {
    if (isLoading || adopted.current) return;
    adopted.current = true;
    setDraftCopy(copy);
    setDraftContact(contact);
  }, [isLoading, copy, contact]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3_000);
  };

  const setCopyField = (field: SiteCopyField, locale: 'fr' | 'en', value: string) =>
    setDraftCopy((prev) => ({ ...prev, [field]: { ...prev[field], [locale]: value } }));

  const validate = () => {
    const next: Partial<Record<keyof ContactDetails, string>> = {};
    if (!isEmail(draftContact.email)) next.email = t('admin.siteContent.emailInvalid');
    if (!isHttpsUrl(draftContact.instagram)) next.instagram = t('admin.siteContent.urlInvalid');
    if (!isHttpsUrl(draftContact.linkedin)) next.linkedin = t('admin.siteContent.urlInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      // One statement for the three rows. site_settings is keyed by `key`, so
      // the upsert resolves each row on its own conflict target.
      const { error } = await typedFrom('site_settings').upsert([
        { key: 'site_copy', value: draftCopy },
        { key: 'contact_email', value: draftContact.email },
        {
          key: 'social_links',
          value: { instagram: draftContact.instagram, linkedin: draftContact.linkedin },
        },
      ]);
      if (error) throw error;

      refresh();
      showMessage('success', t('admin.siteContent.saveSuccess'));
    } catch {
      showMessage('error', t('admin.siteContent.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-vermillon border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div
          role="status"
          className={`mb-6 p-4 border ${
            message.type === 'success'
              ? 'bg-green-100 border-green-200 text-green-800'
              : 'bg-red-100 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        <section className="p-6 bg-gray-50 border border-gray-200">
          <h3 className="font-display text-xl text-gray-900">
            {t('admin.siteContent.copyTitle')}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">{t('admin.siteContent.copyHint')}</p>

          <div className="space-y-6">
            {SITE_COPY_FIELDS.map((field) => {
              const Control = MULTILINE.has(field) ? 'textarea' : 'input';
              const rows = MULTILINE.has(field) ? { rows: 2 } : {};

              return (
                <div key={field}>
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">
                    {t(`admin.siteContent.${field}` as 'admin.siteContent.heroAvailability')}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs text-gray-500 mb-1">
                        {t('admin.siteContent.fr')}
                      </span>
                      <Control
                        {...rows}
                        value={draftCopy[field].fr}
                        onChange={(e: { target: { value: string } }) =>
                          setCopyField(field, 'fr', e.target.value)
                        }
                        placeholder={DEFAULT_SITE_COPY[field].fr}
                        className={FIELD_CLASS}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 mb-1">
                        {t('admin.siteContent.en')}
                      </span>
                      <Control
                        {...rows}
                        value={draftCopy[field].en ?? ''}
                        onChange={(e: { target: { value: string } }) =>
                          setCopyField(field, 'en', e.target.value)
                        }
                        placeholder={DEFAULT_SITE_COPY[field].en ?? ''}
                        className={FIELD_CLASS}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="p-6 bg-gray-50 border border-gray-200">
          <h3 className="font-display text-xl text-gray-900">
            {t('admin.siteContent.contactTitle')}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">{t('admin.siteContent.contactHint')}</p>

          <div className="space-y-4">
            {(['email', 'instagram', 'linkedin'] as const).map((key) => (
              <label key={key} className="block">
                <span className="block text-xs text-gray-500 mb-1">
                  {t(`admin.siteContent.${key}` as 'admin.siteContent.email')}
                </span>
                <input
                  type={key === 'email' ? 'email' : 'url'}
                  value={draftContact[key]}
                  onChange={(e) => setDraftContact({ ...draftContact, [key]: e.target.value })}
                  placeholder={
                    key === 'email'
                      ? t('admin.siteContent.emailPlaceholder')
                      : DEFAULT_CONTACT_DETAILS[key]
                  }
                  aria-invalid={Boolean(errors[key])}
                  className={`${FIELD_CLASS} ${errors[key] ? 'border-red-500' : ''}`}
                />
                {errors[key] && <span className="block text-xs text-red-600 mt-1">{errors[key]}</span>}
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-gray-900 text-white text-sm uppercase tracking-[0.18em] hover:bg-black transition-colors disabled:opacity-50"
          >
            {isSaving ? t('admin.siteContent.saving') : t('admin.siteContent.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SiteContentSettings;
