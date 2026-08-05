import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Footer } from '@/components/Layout/Footer';
import { BurgerMenu } from '@/components/Navigation/BurgerMenu';
import { useLanguage } from '@/context/LanguageContext';

const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/dyavol_litso',
  linkedin: 'https://www.linkedin.com/in/tristan-henrard-2688a6198/',
  email: 'henrard.tristan@proton.me',
};

interface SiteLayoutProps {
  children: React.ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // The overlay covers the whole page, so it owns the keyboard while open:
  // Escape closes it and focus returns to the control that opened it.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        burgerRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;

      if (y < lastScrollY.current || y < 50) {
        setShowNavbar(true);
      } else if (y > lastScrollY.current && y > 100) {
        setShowNavbar(false);
        setIsMenuOpen(false);
      }

      lastScrollY.current = y;
      ticking.current = false;
    };

    // Ref, not state: the previous position is bookkeeping, not something the
    // UI renders. Holding it in state re-rendered the layout on every frame
    // and re-ran this effect, competing with image decode.
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Numbered as plates, like the frames in the portfolio.
  const NAV_ITEMS = [
    { to: '/', label: t('nav.home') },
    { to: '/#portfolio', label: t('nav.portfolio') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const languageToggle = (size: 'header' | 'overlay') => (
    <div
      className={`flex items-baseline gap-2.5 ${
        size === 'header' ? 'text-[10px] tracking-[0.22em]' : 'text-[11px] tracking-[0.22em]'
      }`}
    >
      {(['fr', 'en'] as const).map((lang, i) => (
        <span key={lang} className="flex items-baseline gap-2.5">
          {i > 0 && (
            <span aria-hidden="true" className="text-bone-faint">
              /
            </span>
          )}
          {/* Language names stay untranslated on purpose: a language is named
              in its own language. */}
          <button
            type="button"
            onClick={() => setLanguage(lang)}
            aria-label={lang === 'fr' ? 'Français' : 'English'}
            aria-pressed={language === lang}
            className={`pb-[3px] uppercase transition-colors duration-300 ${
              language === lang
                ? 'border-b border-vermillon text-bone'
                : 'text-bone-muted hover:text-bone'
            }`}
          >
            {size === 'header' ? lang : lang === 'fr' ? 'Français' : 'English'}
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-ink text-bone">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-bone focus:px-4 focus:py-2 focus:text-ink"
      >
        {t('nav.skipToContent')}
      </a>

      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b border-bone-hair bg-ink/85 backdrop-blur-sm transition-transform duration-300 ${
          showNavbar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex h-[58px] items-center justify-between px-5 lg:h-[84px] lg:px-10">
          <Link
            to="/"
            className="text-[9.5px] font-medium uppercase tracking-wordmark text-bone transition-opacity hover:opacity-70 lg:text-[11px]"
          >
            HENRARDVISUALS
          </Link>

          <div className="flex items-center gap-6 lg:gap-9">
            {languageToggle('header')}
            <BurgerMenu
              ref={burgerRef}
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              label={t('nav.toggleMenu')}
              controls="mobile-menu"
            />
          </div>
        </div>
      </header>

      {/* The overlay is only faded out, so without inert its links stayed
          focusable while invisible. */}
      <div
        id="mobile-menu"
        ref={overlayRef}
        {...(isMenuOpen ? {} : { inert: '' })}
        aria-hidden={!isMenuOpen}
        className={`fixed inset-0 z-[55] bg-ink transition-opacity duration-300 ${
          isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-full flex-col justify-between px-5 py-6 lg:px-8 lg:py-7">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-medium uppercase tracking-wordmark">
              HENRARDVISUALS
            </span>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                burgerRef.current?.focus();
              }}
              aria-label={t('nav.closeMenu')}
              className="p-2 text-bone-muted transition-colors duration-300 hover:text-bone"
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <line x1="1" y1="1" x2="19" y2="19" />
                <line x1="19" y1="1" x2="1" y2="19" />
              </svg>
            </button>
          </div>

          <nav aria-label={t('nav.primary')}>
            {NAV_ITEMS.map((item, i) => (
              <div
                key={item.to}
                className="flex items-baseline gap-4 border-b border-bone-hair py-2 last:border-b-0"
              >
                <span aria-hidden="true" className="caption-caps w-7 shrink-0 text-bone-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Link
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="font-display text-[clamp(2rem,9vw,3.25rem)] leading-none text-bone transition-colors duration-500 hover:text-vermillon"
                >
                  {item.label}
                </Link>
              </div>
            ))}
          </nav>

          <div className="flex flex-col gap-5 border-t border-bone-hair pt-5 sm:flex-row sm:items-end sm:justify-between">
            {languageToggle('overlay')}
            <div className="flex flex-wrap items-baseline gap-5 text-[9px] uppercase tracking-caption text-bone-muted">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bone"
              >
                Instagram
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bone"
              >
                LinkedIn
              </a>
              <a href={`mailto:${SOCIAL_LINKS.email}`} className="text-bone/75 hover:text-bone">
                {SOCIAL_LINKS.email}
              </a>
            </div>
          </div>
        </div>
      </div>

      <main id="main" tabIndex={-1}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
