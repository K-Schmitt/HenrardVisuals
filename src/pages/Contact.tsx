import { useLanguage } from '@/context/LanguageContext';

export function Contact() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 lg:px-16">
      <div className="max-w-2xl mx-auto py-20">
        <h1 className="font-serif text-5xl lg:text-6xl uppercase tracking-tight mb-8 text-center">
          Contact
        </h1>

        <p className="text-gray-400 text-center mb-12">
          {t(
            'Pour toute demande de collaboration ou booking, contactez-moi directement.',
            'For any collaboration or booking inquiries, please contact me directly.'
          )}
        </p>

        <div className="space-y-8 text-center">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Email</h2>
            <a
              href="mailto:contact@henrardvisuals.com"
              className="text-xl hover:text-gray-300 transition-colors"
            >
              contact@henrardvisuals.com
            </a>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Instagram</h2>
            <a
              href="https://instagram.com/henrardvisuals"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl hover:text-gray-300 transition-colors"
            >
              @henrardvisuals
            </a>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">
              {t('Localisation', 'Location')}
            </h2>
            <p className="text-xl text-gray-300">Paris, France</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
