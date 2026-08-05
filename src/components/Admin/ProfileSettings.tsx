import { useState, useEffect, useCallback, useRef } from 'react';

import { DEFAULT_PROFILE_SETTINGS, isProfileSettings } from '@/constants/profileDefaults';
import { useLanguage } from '@/context/LanguageContext';
import { typedFrom } from '@/lib/supabase';
import type { ProfileSettings as ProfileSettingsType } from '@/types';

// SVG Icon inline
const SaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

export function ProfileSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<ProfileSettingsType>(DEFAULT_PROFILE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3_000);
  }, []);

  // Same reason as CategoryManager: t must not be a dependency of a fetch
  // callback, but reading it out of a stale closure would freeze the error
  // message in whichever language was active on mount.
  const tRef = useRef(t);
  tRef.current = t;

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await typedFrom('site_settings')
        .select('value')
        .eq('key', 'profile_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const raw = (data as { value: unknown } | null)?.value;
      if (isProfileSettings(raw)) setSettings(raw);
    } catch {
      showMessage('error', tRef.current('admin.profileSettings.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await typedFrom('site_settings').upsert({
        key: 'profile_settings',
        value: settings,
      });

      if (error) throw error;
      showMessage('success', t('admin.profileSettings.saveSuccess'));
    } catch {
      showMessage('error', t('admin.profileSettings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateStat = (index: number, field: keyof (typeof settings.stats)[0], value: string) => {
    const newStats = [...settings.stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setSettings({ ...settings, stats: newStats });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-elegant ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-200 text-green-800'
              : 'bg-red-100 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Header Section */}
        <section className="p-6 bg-gray-50 border border-gray-200 rounded-elegant">
          <h3 className="font-serif text-xl text-gray-900 mb-6">{t('admin.profileSettings.headerInfo')}</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="profile-subtitle-fr" className="block text-sm text-gray-600 mb-2">
                {t('admin.profileSettings.subtitleFr')}
              </label>
              <input
                id="profile-subtitle-fr"
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label htmlFor="profile-subtitle-en" className="block text-sm text-gray-600 mb-2">
                {t('admin.profileSettings.subtitleEn')}
              </label>
              <input
                id="profile-subtitle-en"
                type="text"
                value={settings.subtitle_en || ''}
                onChange={(e) => setSettings({ ...settings, subtitle_en: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                placeholder={t('admin.profileSettings.subtitleEnPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="profile-attributes-fr" className="block text-sm text-gray-600 mb-2">
                {t('admin.profileSettings.attributesFr')}
              </label>
              <input
                id="profile-attributes-fr"
                type="text"
                value={settings.attributes}
                onChange={(e) => setSettings({ ...settings, attributes: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label htmlFor="profile-attributes-en" className="block text-sm text-gray-600 mb-2">
                {t('admin.profileSettings.attributesEn')}
              </label>
              <input
                id="profile-attributes-en"
                type="text"
                value={settings.attributes_en || ''}
                onChange={(e) => setSettings({ ...settings, attributes_en: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                placeholder={t('admin.profileSettings.attributesEnPlaceholder')}
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="p-6 bg-gray-50 border border-gray-200 rounded-elegant">
          <h3 className="font-serif text-xl text-gray-900 mb-6">{t('admin.profileSettings.modelStats')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings.stats.map((stat, index) => (
              <div key={index} className="p-4 bg-white border border-gray-200">
                <div className="space-y-3">
                  <div>
                    <label htmlFor={`stat-${index}-label-fr`} className="block text-xs text-gray-500 mb-1">
                      {t('admin.profileSettings.labelFr')}
                    </label>
                    <input
                      id={`stat-${index}-label-fr`}
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor={`stat-${index}-label-en`} className="block text-xs text-gray-500 mb-1">
                      {t('admin.profileSettings.labelEn')}
                    </label>
                    <input
                      id={`stat-${index}-label-en`}
                      type="text"
                      value={stat.label_en || ''}
                      onChange={(e) => updateStat(index, 'label_en', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                      placeholder={t('admin.profileSettings.labelEnPlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor={`stat-${index}-value`} className="block text-xs text-gray-500 mb-1">
                      {t('admin.profileSettings.value')}
                    </label>
                    <input
                      id={`stat-${index}-value`}
                      type="text"
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor={`stat-${index}-unit`} className="block text-xs text-gray-500 mb-1">
                      {t('admin.profileSettings.unit')}
                    </label>
                    <input
                      id={`stat-${index}-unit`}
                      type="text"
                      value={stat.unit}
                      onChange={(e) => updateStat(index, 'unit', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Biography Section */}
        <section className="p-6 bg-gray-50 border border-gray-200 rounded-elegant">
          <h3 className="font-serif text-xl text-gray-900 mb-6">{t('admin.profileSettings.biography')}</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="profile-bio-fr" className="block text-sm text-gray-600 mb-2">
                {t('admin.profileSettings.bioFr')}
              </label>
              <textarea
                id="profile-bio-fr"
                value={settings.biography}
                onChange={(e) => setSettings({ ...settings, biography: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black resize-none"
              />
            </div>
            <div>
              <label htmlFor="profile-bio-en" className="block text-sm text-gray-600 mb-2">
                {t('admin.profileSettings.bioEn')}
              </label>
              <textarea
                id="profile-bio-en"
                value={settings.biography_en || ''}
                onChange={(e) => setSettings({ ...settings, biography_en: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black resize-none"
                placeholder={t('admin.profileSettings.bioEnPlaceholder')}
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-ink text-bone rounded-elegant hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <SaveIcon />
            {isSaving ? t('admin.profileSettings.saving') : t('admin.profileSettings.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
