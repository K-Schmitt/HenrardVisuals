import type { ProfileSettings } from '@/types';

export function isProfileSettings(v: unknown): v is ProfileSettings {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (typeof s['subtitle'] !== 'string') return false;
  if (typeof s['attributes'] !== 'string') return false;
  if (typeof s['biography'] !== 'string') return false;
  if (!Array.isArray(s['stats'])) return false;
  return (s['stats'] as unknown[]).every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const stat = item as Record<string, unknown>;
    return (
      typeof stat['value'] === 'string' &&
      typeof stat['unit'] === 'string' &&
      typeof stat['label'] === 'string'
    );
  });
}

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  subtitle: 'диво дьявола • Life is but a dream',
  stats: [
    { value: '188', unit: "6' 2\"", label: 'HEIGHT' },
    { value: '94', unit: '37"', label: 'CHEST' },
    { value: '74', unit: '29"', label: 'WAIST' },
    { value: '92', unit: '36"', label: 'HIPS' },
    { value: '44', unit: 'EU', label: 'SHOES' },
  ],
  attributes: 'Hair: Platinum Blonde | Eyes: Blue',
  biography: `Blending the stark elegance of Parisian editorial with the raw, chaotic energy of the underground, Tristan embodies a modern duality: the angelic and the demonic. His platinum blonde hair and piercing blue eyes have graced the covers of international fashion magazines, while his enigmatic presence continues to captivate audiences on runways from Paris to Tokyo.

With a background in contemporary art and an innate understanding of avant-garde fashion, Tristan brings a unique perspective to every project. His work transcends traditional modeling, becoming a form of performance art that challenges conventions and redefines masculine beauty in the modern era.`,
};
