import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/dyavol_litso',
  linkedin: 'https://www.linkedin.com/in/tristan-henrard-2688a6198/',
};

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              to="/"
              className="font-serif text-2xl tracking-[0.2em] uppercase text-white hover:opacity-80 transition-opacity"
            >
              HENRARDVISUALS
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              {t(
                "L'essentiel, sans démonstration - l'image au service de l'art.",
                "The essential, without demonstration - the image at the service of art."
              )}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-gray-400">Navigation</h4>
            <nav className="flex flex-col gap-3">
              <Link to="/" className="text-gray-500 hover:text-white transition-colors text-sm">
                {t('Accueil', 'Home')}
              </Link>
              <Link
                to="/contact"
                className="text-gray-500 hover:text-white transition-colors text-sm"
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-gray-400">Contact</h4>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:henrard.tristan@proton.me"
                className="block text-gray-500 hover:text-white transition-colors"
              >
                henrard.tristan@proton.me
              </a>
              <div className="flex gap-4 pt-2">
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </a>
                <a
                  href={SOCIAL_LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-xs">
              © {currentYear} Tristan Henrard. {t('Tous droits réservés.', 'All rights reserved.')}
            </p>
            <p className="text-gray-600 text-xs">
              {t('Site créé par', 'Website created by')}{' '}
              <a
                href="https://slackliniste.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Kylian Schmitt
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
