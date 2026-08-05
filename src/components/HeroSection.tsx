import { OptimizedImage } from '@/components/OptimizedImage';
import { useLanguage } from '@/context/LanguageContext';
import { buildImageUrl, buildImageSrcSet, HERO_WIDTHS } from '@/lib/imageUrl';
import type { Photo, ProfileSettings, ProfileStat } from '@/types';

interface HeroSectionProps {
  heroPhoto: Photo | null;
  profileSettings: ProfileSettings;
}

/**
 * "Cheveux: Blond Platine | Yeux: Bleus" is one free-text field in the admin,
 * but the book sets it as separate technical annotations. Split on the pipe,
 * then swap the colon for the em dash the caption style uses. Anything that
 * does not follow the convention is passed through untouched rather than
 * mangled.
 */
function splitAttributes(attributes: string): { label: string; value: string }[] {
  return attributes
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [label, ...rest] = part.split(/\s*:\s*/);
      return { label: label ?? part, value: rest.join(': ') };
    });
}

/** One measurement: figure, unit, then the label as a caption underneath. */
function Stat({ stat, isFrench }: { stat: ProfileStat; isFrench: boolean }) {
  return (
    <div className="flex-1 border-l border-bone-faint pl-3.5 first:border-l-0 first:pl-0">
      <div className="text-[15px] tracking-[0.02em]">
        {stat.value}
        {stat.unit && (
          <span className="ml-1 text-[9px] tracking-[0.14em] text-bone-muted">{stat.unit}</span>
        )}
      </div>
      <div className="caption-caps mt-1.5 text-bone-muted">
        {isFrench ? stat.label : stat.label_en ?? stat.label}
      </div>
    </div>
  );
}

export function HeroSection({ heroPhoto, profileSettings }: HeroSectionProps) {
  const { language, t } = useLanguage();
  const isFrench = language === 'fr';

  const subtitle = isFrench
    ? profileSettings.subtitle
    : profileSettings.subtitle_en ?? profileSettings.subtitle;
  const attributes = splitAttributes(
    isFrench ? profileSettings.attributes : profileSettings.attributes_en ?? profileSettings.attributes
  );
  const biography = isFrench
    ? profileSettings.biography
    : profileSettings.biography_en ?? profileSettings.biography;

  return (
    <section className="relative">
      {/* The frame: full bleed on mobile, a 57/43 split on desktop with the
          name set across the seam in mix-blend-mode: difference — it inverts
          over the photograph and returns to white over the black. */}
      <div className="relative h-[78svh] min-h-[520px] overflow-hidden lg:h-[880px] lg:max-h-[100svh] lg:min-h-[680px]">
        <div className="absolute inset-y-0 left-0 w-full lg:w-[57%] [&>div]:h-full">
          {heroPhoto ? (
            <OptimizedImage
              src={buildImageUrl(heroPhoto.storage_path, { width: 1280 })}
              fallbackSrc={buildImageUrl(heroPhoto.storage_path)}
              srcSet={buildImageSrcSet(heroPhoto.storage_path, HERO_WIDTHS)}
              sizes="(min-width: 1024px) 57vw, 100vw"
              alt={heroPhoto.title}
              width={heroPhoto.width ?? undefined}
              height={heroPhoto.height ?? undefined}
              // The box is sized by the frame around it, so no ratio is
              // reserved; object-cover crops toward the upper third, where a
              // portrait's face sits.
              aspect="auto"
              className="h-full w-full object-cover object-[56%_16%]"
              priority
              reveal
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-frame">
              <div
                role="status"
                aria-label={t('gallery.loading')}
                className="h-12 w-12 animate-spin rounded-full border-2 border-bone border-t-transparent"
              />
            </div>
          )}
        </div>

        {/* Mobile lifts the name off the photograph with a gradient; desktop
            uses the diagonal wash the doc specifies across the split. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[340px] bg-gradient-to-t from-ink via-ink/70 to-transparent lg:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-[57%] bg-[linear-gradient(102deg,transparent_34%,rgba(10,10,10,0.62)_92%)] lg:block"
        />
        <div aria-hidden="true" className="absolute inset-y-0 left-[57%] hidden w-px bg-bone-faint lg:block" />

        <div className="animate-rise absolute inset-x-5 bottom-7 lg:inset-x-auto lg:bottom-auto lg:left-[41.5%] lg:top-[15%] lg:w-[55%]">
          <h1 className="font-display text-display mix-blend-normal lg:mix-blend-difference lg:text-white">
            <span className="block">TRISTAN</span>
            <span className="block text-right">HENRARD</span>
          </h1>

          {/* Mobile only: on desktop this line heads the specification block
              on the right instead. */}
          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-bone-faint pt-3 lg:hidden">
            <span className="font-serif text-[12.5px] italic text-bone-muted">{subtitle}</span>
            <span className="caption-caps shrink-0 text-bone-muted">Paris</span>
          </div>
        </div>

        {/* Desktop specification block, anchored to the foot of the frame. */}
        <div className="absolute bottom-10 right-10 hidden w-[472px] lg:block">
          <p className="mb-6 font-serif text-[15px] italic text-bone-muted">{subtitle}</p>

          <div className="flex border-y border-bone-faint py-3">
            {profileSettings.stats.map((stat, i) => (
              <Stat key={i} stat={stat} isFrench={isFrench} />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {attributes.map(({ label, value }) => (
              <span key={label} className="caption-caps text-bone-muted">
                {value ? `${label} — ${value}` : label}
              </span>
            ))}
          </div>

          {/* max-w keeps the measure near the 46ch the type scale specifies. */}
          <p className="mt-10 max-w-[430px] whitespace-pre-line text-[14.5px] leading-[1.75] text-bone-muted">
            {biography}
          </p>

          <div className="mt-8 flex items-center gap-3">
            <span className="block h-[5px] w-[5px] bg-vermillon" />
            <span className="micro-caps text-bone-muted">{t('hero.availability')}</span>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-10 left-10 hidden items-end gap-3.5 mix-blend-difference text-white lg:flex"
        >
          <span className="micro-caps [writing-mode:vertical-rl]">{t('hero.scroll')}</span>
          <span className="block h-[72px] w-px bg-current opacity-60" />
        </div>
      </div>

      {/* Mobile specification sheet — the desktop's ruled row does not survive
          a 390 px viewport, so the same data becomes a plain list. */}
      <div className="px-5 pt-9 lg:hidden">
        <h2 className="micro-caps mb-4 text-vermillon">{t('hero.specsTitle')}</h2>
        <dl>
          {profileSettings.stats.map((stat, i) => (
            <div
              key={i}
              className="flex justify-between border-t border-bone-hair py-2.5 text-[11px] uppercase tracking-[0.16em]"
            >
              <dt className="text-bone-muted">{isFrench ? stat.label : stat.label_en ?? stat.label}</dt>
              <dd>
                {stat.value}
                {stat.unit ? ` ${stat.unit}` : ''}
              </dd>
            </div>
          ))}
          {attributes.map(({ label, value }, i) => (
            <div
              key={label}
              className={`flex justify-between gap-4 border-t border-bone-hair py-2.5 text-[11px] uppercase tracking-[0.16em] ${
                i === attributes.length - 1 ? 'border-b' : ''
              }`}
            >
              <dt className="text-bone-muted">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 whitespace-pre-line text-sm leading-[1.8] text-bone-muted">{biography}</p>
        <div className="mt-8 flex items-center gap-3">
          <span className="block h-[5px] w-[5px] bg-vermillon" />
          <span className="micro-caps text-bone-muted">{t('hero.availability')}</span>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
