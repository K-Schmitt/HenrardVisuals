import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProfileSettings as ProfileSettingsType } from '@/types';

// SVG Icon inline
const SaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const DEFAULT_SETTINGS: ProfileSettingsType = {
  subtitle: 'диво дьявола • Life is but a dream',
  stats: [
    { value: '188', unit: '6\' 2\"', label: 'HEIGHT' },
    { value: '94', unit: '37\"', label: 'CHEST' },
    { value: '74', unit: '29\"', label: 'WAIST' },
    { value: '92', unit: '36\"', label: 'HIPS' },
    { value: '44', unit: 'EU', label: 'SHOES' },
  ],
  attributes: 'Hair: Platinum Blonde | Eyes: Blue',
  biography: `Blending the stark elegance of Parisian editorial with the raw, chaotic energy of the underground, Tristan embodies a modern duality: the angelic and the demonic. His platinum blonde hair and piercing blue eyes have graced the covers of international fashion magazines, while his enigmatic presence continues to captivate audiences on runways from Paris to Tokyo.

With a background in contemporary art and an innate understanding of avant-garde fashion, Tristan brings a unique perspective to every project. His work transcends traditional modeling, becoming a form of performance art that challenges conventions and redefines masculine beauty in the modern era.`,
};

export function ProfileSettings() {
  const [settings, setSettings] = useState<ProfileSettingsType>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'profile_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings((data as any).value as ProfileSettingsType);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      showMessage('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('site_settings').upsert({
        key: 'profile_settings',
        value: settings as any,
        updated_at: new Date().toISOString(),
      } as any);

      if (error) throw error;
      showMessage('success', 'Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      showMessage('error', 'Failed to save settings');
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
          <h3 className="font-serif text-xl text-gray-900 mb-6">Header Info</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Subtitle (FR)</label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Subtitle (EN)</label>
              <input
                type="text"
                value={settings.subtitle_en || ''}
                onChange={(e) => setSettings({ ...settings, subtitle_en: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                placeholder="English subtitle..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Attributes (FR)</label>
              <input
                type="text"
                value={settings.attributes}
                onChange={(e) => setSettings({ ...settings, attributes: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Attributes (EN)</label>
              <input
                type="text"
                value={settings.attributes_en || ''}
                onChange={(e) => setSettings({ ...settings, attributes_en: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black"
                placeholder="English attributes..."
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="p-6 bg-gray-50 border border-gray-200 rounded-elegant">
          <h3 className="font-serif text-xl text-gray-900 mb-6">Model Stats</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings.stats.map((stat, index) => (
              <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Label (FR)</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Label (EN)</label>
                    <input
                      type="text"
                      value={stat.label_en || ''}
                      onChange={(e) => updateStat(index, 'label_en', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                      placeholder="English label"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit</label>
                    <input
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
          <h3 className="font-serif text-xl text-gray-900 mb-6">Biography</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Bio Text (FR)</label>
              <textarea
                value={settings.biography}
                onChange={(e) => setSettings({ ...settings, biography: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Bio Text (EN)</label>
              <textarea
                value={settings.biography_en || ''}
                onChange={(e) => setSettings({ ...settings, biography_en: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-elegant text-gray-900 focus:outline-none focus:border-black resize-none"
                placeholder="English biography..."
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-elegant hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <SaveIcon />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
