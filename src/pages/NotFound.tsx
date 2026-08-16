import { Link } from 'react-router-dom';

import { EmptyPlate } from '@/components/NotFound/EmptyPlate';
import { SuggestedPlates } from '@/components/NotFound/SuggestedPlates';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteContent } from '@/context/SiteContentContext';

/**
 * Direction 1a, screen 2a — "LA PLANCHE MANQUANTE". Two columns on desktop
 * (the empty plate left, the statement and the exits right), one stack on
 * mobile where the exits become full-width rows separated by hairlines.
 *
 * Three exits rather than one, per the doc: a visitor is never left in a
 * cul-de-sac.
 *
 * Metadata — title, noindex — comes from the route table via useSeo in
 * SiteLayout. This component owns markup and copy only.
 */
export function NotFound() {
  const { t } = useLanguage();
  const { contact } = useSiteContent();

  const exit =
    'flex min-h-[52px] items-center justify-between border-t border-bone-hair text-[11px] uppercase tracking-[0.22em] transition-colors duration-[400ms] lg:min-h-0 lg:justify-start lg:border-t-0 lg:border-b lg:pb-2 lg:tracking-[0.24em]';
  const secondary = 'text-bone-muted hover:text-bone lg:border-b-bone/25 lg:hover:border-b-bone';

  return (
    <div className="min-h-screen bg-ink pt-[58px] lg:pt-[84px]">
      <div className="animate-rise px-5 pt-11 lg:flex lg:items-start lg:gap-20 lg:px-10 lg:pt-[118px]">
        <div className="lg:w-[460px] lg:flex-none">
          <EmptyPlate />
        </div>

        <div className="lg:max-w-[640px] lg:pt-4">
          <div className="mt-11 flex items-center gap-2.5 lg:mt-0 lg:gap-3">
            <span aria-hidden="true" className="block h-[5px] w-[5px] bg-vermillon" />
            <span className="micro-caps text-bone-muted">{t('notFound.eyebrow')}</span>
          </div>

          <h1 className="mt-5 font-display text-[clamp(2.75rem,6.1vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.018em] text-bone lg:mt-[30px] lg:leading-[0.98]">
            {t('notFound.title')}
          </h1>

          <p className="mt-6 max-w-[430px] text-[14px] leading-[1.8] text-bone-muted lg:mt-[34px] lg:text-[14.5px] lg:leading-[1.75]">
            {t('notFound.lead')}
          </p>

          <nav
            aria-label={t('notFound.navLabel')}
            className="mt-9 flex flex-col border-b border-bone-hair lg:mt-12 lg:flex-row lg:gap-10 lg:border-b-0"
          >
            <Link to="/" className={`${exit} text-bone hover:text-vermillon lg:border-b-vermillon`}>
              {t('notFound.home')}
              <span aria-hidden="true" className="text-vermillon lg:hidden">
                →
              </span>
            </Link>

            <Link to="/#portfolio" className={`${exit} ${secondary}`}>
              {t('notFound.portfolio')}
              <span aria-hidden="true" className="text-bone/50 lg:hidden">
                →
              </span>
            </Link>

            {/* mailto leaves the application, so a real anchor — a router Link
                would try to resolve it as a route. */}
            <a href={`mailto:${contact.email}`} className={`${exit} ${secondary}`}>
              {t('notFound.write')}
              <span aria-hidden="true" className="text-bone/50 lg:hidden">
                →
              </span>
            </a>
          </nav>
        </div>
      </div>

      <SuggestedPlates />
    </div>
  );
}

export default NotFound;
