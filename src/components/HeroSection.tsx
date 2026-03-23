import { getStorageUrl } from '@/lib/supabase';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useLanguage } from '@/context/LanguageContext';
import type { Photo, ProfileSettings } from '@/types';

interface HeroSectionProps {
  heroPhoto: Photo | null;
  profileSettings: ProfileSettings;
}

export function HeroSection({ heroPhoto, profileSettings }: HeroSectionProps) {
  const { language } = useLanguage();

  return (
    <section>
      <div className="flex flex-col lg:flex-row lg:min-h-screen">
        <div className="relative lg:w-1/2 min-h-[60vh] lg:min-h-screen lg:sticky lg:top-0 bg-black pt-16 pb-4 px-4">
          <div className="h-full flex items-start justify-center">
            {heroPhoto ? (
              <OptimizedImage
                src={getStorageUrl(heroPhoto.storage_path)}
                alt={heroPhoto.title}
                className="w-full h-auto max-h-[calc(100vh-5rem)] object-contain grayscale hover:grayscale-0 transition-all duration-700"
                priority={true}
              />
            ) : (
              <div className="w-full h-64 bg-black flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-2 border-white border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-1/2 bg-black px-8 py-12 lg:px-16 lg:py-20 lg:pt-24">
          <h2 className="font-serif text-6xl lg:text-7xl xl:text-8xl text-center uppercase tracking-tight mb-6">
            TRISTAN
            <br />
            HENRARD
          </h2>

          <p className="text-center text-gray-400 text-sm mb-12">
            {language === 'fr'
              ? profileSettings.subtitle
              : profileSettings.subtitle_en ?? profileSettings.subtitle}
          </p>

          <div className="flex justify-center items-start gap-8 mb-12 flex-wrap">
            {profileSettings.stats.map((stat, i) => (
              <div key={i} className="flex items-start gap-8">
                <div className="text-center">
                  <div className="text-3xl font-light text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500 mb-2">{stat.unit}</div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest">
                    {language === 'fr' ? stat.label : stat.label_en ?? stat.label}
                  </div>
                </div>
                {i < profileSettings.stats.length - 1 && (
                  <div className="w-px h-16 bg-gray-800" />
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs uppercase tracking-[0.2em] text-gray-400 mb-12">
            {language === 'fr'
              ? profileSettings.attributes
              : profileSettings.attributes_en ?? profileSettings.attributes}
          </p>

          <div className="max-w-2xl mx-auto text-gray-400 text-sm leading-relaxed whitespace-pre-line">
            {language === 'fr'
              ? profileSettings.biography
              : profileSettings.biography_en ?? profileSettings.biography}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
