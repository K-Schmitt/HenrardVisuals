import type { ProfileSettings } from '@/types';

export function isProfileSettings(v: unknown): v is ProfileSettings {
  return (
    typeof v === 'object' &&
    v !== null &&
    'subtitle' in v &&
    'stats' in v &&
    Array.isArray((v as ProfileSettings).stats)
  );
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
