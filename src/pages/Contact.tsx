import { ContactSection } from '@/components/Layout/ContactSection';
import { useSiteContent } from '@/context/SiteContentContext';

export function Contact() {
  const { text } = useSiteContent();

  return (
    <div className="min-h-screen bg-ink text-bone pt-[58px] lg:pt-[84px]">
      {/* The same block the home page closes on, promoted to the page's own
          subject — so the two surfaces set the address identically. */}
      <ContactSection headingLevel={1} />

      <div className="mt-16 grid grid-cols-1 gap-10 px-5 lg:mt-24 lg:grid-cols-[340fr_1fr] lg:gap-14 lg:px-10">
        <div className="micro-caps text-vermillon">{text('contactTagline')}</div>
        <div>
          <p className="max-w-[46ch] text-[14.5px] leading-[1.75] text-bone-muted lg:text-base">
            {text('contactDescription')}
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-bone-faint pt-5">
            <span className="block h-[5px] w-[5px] bg-vermillon" />
            <span className="micro-caps text-bone-muted">{text('contactResponseTime')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
