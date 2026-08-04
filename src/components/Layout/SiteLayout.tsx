import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Footer } from '@/components/Layout/Footer';
import { BurgerMenu } from '@/components/Navigation/BurgerMenu';
import { useLanguage } from '@/context/LanguageContext';

const FrenchFlag = ({ className = 'w-6 h-4' }: { className?: string }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="600" fill="#002395" />
    <rect x="300" width="300" height="600" fill="#FFFFFF" />
    <rect x="600" width="300" height="600" fill="#ED2939" />
  </svg>
);

const UKFlag = ({ className = 'w-6 h-4' }: { className?: string }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="s">
      <path d="M0,0 v30 h60 v-30 z" />
    </clipPath>
    <clipPath id="t">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
    </clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

interface SiteLayoutProps {
  children: React.ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
    setIsLangOpen(false);
  }, [location]);

  // A menu that only closes by clicking its trigger again is a trap for
  // keyboard users; Escape and any outside click close it too.
  useEffect(() => {
    if (!isLangOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLangOpen(false);
    };
    // Anchored on the wrapper: the click that opened the menu is still
    // bubbling when this listener attaches, so a blanket handler would close
    // the menu in the same tick it opened.
    const onDocumentClick = (e: MouseEvent) => {
      if (!langMenuRef.current?.contains(e.target as Node)) setIsLangOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocumentClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [isLangOpen]);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-white focus:text-black focus:px-4 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm transition-transform duration-300 ${
          showNavbar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-serif text-xl tracking-[0.3em] uppercase text-white hover:opacity-80 transition-opacity"
          >
            HENRARDVISUALS
          </Link>

          <div className="flex items-center gap-8">
            {/* lg:hidden rather than opacity-0 pointer-events-none: the old
                version kept three controls in the tab order while invisible,
                so keyboard focus disappeared into a menu nobody could see. */}
            <nav
              aria-label={t('nav.primary')}
              className={`hidden items-center gap-6 ${isMenuOpen ? 'lg:flex' : ''}`}
            >
              <div className="relative" ref={langMenuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isLangOpen}
                  aria-label={t('nav.changeLanguage')}
                  onClick={() => setIsLangOpen((open) => !open)}
                  className="hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
                  style={{
                    animation: isMenuOpen
                      ? 'menuSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both'
                      : 'none',
                  }}
                >
                  {language === 'fr' ? (
                    <FrenchFlag className="w-6 h-4" />
                  ) : (
                    <UKFlag className="w-6 h-4" />
                  )}
                </button>
                {/* Was a CSS :hover dropdown with no click handler at all, so
                    the language could not be changed from a keyboard. */}
                <div
                  role="menu"
                  className={`absolute top-full left-0 mt-2 bg-black border border-gray-800 rounded-lg overflow-hidden transition-all duration-200 min-w-[100px] ${
                    isLangOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                  }`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setLanguage('fr');
                      setIsLangOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-900 transition-colors ${language === 'fr' ? 'text-white font-bold' : 'text-gray-400'}`}
                  >
                    <FrenchFlag className="w-5 h-3" /> FR
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setLanguage('en');
                      setIsLangOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-900 transition-colors ${language === 'en' ? 'text-white font-bold' : 'text-gray-400'}`}
                  >
                    <UKFlag className="w-5 h-3" /> EN
                  </button>
                </div>
              </div>

              <Link
                to="/"
                className="text-sm uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
                style={{
                  animation: isMenuOpen
                    ? 'menuSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both'
                    : 'none',
                }}
              >
                {t('nav.home')}
              </Link>

              <Link
                to="/contact"
                className="text-sm uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
                style={{
                  animation: isMenuOpen
                    ? 'menuSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.19s both'
                    : 'none',
                }}
              >
                Contact
              </Link>
            </nav>

            <BurgerMenu
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              label={t('nav.toggleMenu')}
              controls="mobile-menu"
            />
          </div>
        </div>
      </header>

      {/* The drawer is only translated off-screen, so without inert its links
          stayed focusable while invisible. */}
      <div
        id="mobile-menu"
        {...(isMenuOpen ? {} : { inert: '' })}
        aria-hidden={!isMenuOpen}
        className={`fixed top-0 right-0 h-full w-64 bg-black border-l border-gray-800 z-40 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav aria-label={t('nav.primary')} className="flex flex-col gap-6 px-8 pt-24">
          <div className="flex gap-4 mb-4">
            {/* Language names stay untranslated on purpose: a language is
                named in its own language. */}
            <button
              type="button"
              aria-label="Français"
              aria-pressed={language === 'fr'}
              onClick={() => setLanguage('fr')}
              className={`${language === 'fr' ? 'opacity-100' : 'opacity-40'}`}
            >
              <FrenchFlag className="w-8 h-5" />
            </button>
            <button
              type="button"
              aria-label="English"
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
              className={`${language === 'en' ? 'opacity-100' : 'opacity-40'}`}
            >
              <UKFlag className="w-8 h-5" />
            </button>
          </div>

          <Link
            to="/"
            className="text-lg uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/contact"
            className="text-lg uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Contact
          </Link>
        </nav>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main id="main" tabIndex={-1}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
