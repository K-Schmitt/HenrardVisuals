import { useLanguage } from '@/context/LanguageContext';

/**
 * The colophon bar. Navigation used to live here as well; in the book it sits
 * in the overlay instead, and the foot of the page carries only the imprint.
 */
export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-[110px] border-t border-bone-hair px-5 pb-8 pt-6 lg:mt-[150px] lg:px-10">
      <div className="caption-caps flex flex-col gap-3 text-bone-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {currentYear} Tristan Henrard. {t('footer.rights')}
        </span>
        <span className="hidden lg:inline">{t('footer.signature')}</span>
        <span>
          {t('footer.createdBy')}{' '}
          <a
            href="https://slackliniste.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bone-muted transition-colors duration-300 hover:text-bone"
          >
            Kylian Schmitt
          </a>
        </span>
      </div>
    </footer>
  );
}

export default Footer;
