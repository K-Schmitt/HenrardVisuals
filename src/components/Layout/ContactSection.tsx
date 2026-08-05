import { useLanguage } from '@/context/LanguageContext';
import { useSiteContent } from '@/context/SiteContentContext';

interface ContactSectionProps {
  /**
   * The home page already owns an h1 (the name in the hero), so this block
   * heads a section there. On the contact page it is the page's own heading.
   */
  headingLevel?: 1 | 2;
  /** Plate number printed opposite the section marker, as in the book. */
  index?: string;
}

export function ContactSection({ headingLevel = 2, index }: ContactSectionProps) {
  const { t } = useLanguage();
  const { contact, text } = useSiteContent();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <section id="contact" className="px-5 pt-[110px] lg:px-10 lg:pt-[190px]">
      <div className="caption-caps flex justify-between border-t border-bone-faint pt-6 text-bone-muted">
        <span>{t('nav.contact')}</span>
        {index && <span>{index}</span>}
      </div>

      <div className="mt-10 flex flex-col justify-between gap-10 lg:mt-14 lg:flex-row lg:items-end">
        <div>
          <Heading className="whitespace-pre-line font-display text-[clamp(2rem,5.4vw,4rem)] leading-[1.02] tracking-[-0.01em] text-bone/75">
            {text('contactLead')}
          </Heading>

          <a
            href={`mailto:${contact.email}`}
            className="mt-8 inline-block border-b border-bone-faint pb-2.5 font-display text-[clamp(1.5rem,4.6vw,4.75rem)] leading-none tracking-[-0.02em] text-bone transition-colors duration-500 hover:border-vermillon hover:text-vermillon lg:mt-10"
          >
            {contact.email}
          </a>
        </div>

        <div className="flex flex-row gap-6 lg:flex-col lg:items-end lg:gap-4 lg:pb-6">
          <a
            href={contact.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="micro-caps text-bone-muted transition-colors duration-300 hover:text-bone"
          >
            Instagram ↗
          </a>
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="micro-caps text-bone-muted transition-colors duration-300 hover:text-bone"
          >
            LinkedIn ↗
          </a>
          <span className="micro-caps text-bone-muted">{text('contactBase')}</span>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
