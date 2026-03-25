import { useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';

// Icônes SVG inline pour éviter les dépendances
const MailIcon = ({ className = "w-5 h-5 sm:w-6 sm:h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5 sm:w-6 sm:h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = ({ className = "w-5 h-5 sm:w-6 sm:h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const ArrowIcon = ({ className = "w-4 h-4 sm:w-5 sm:h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

interface ContactCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  delay?: string;
}

function ContactCard({ icon, label, value, href, external = false, delay = '0ms' }: ContactCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative block"
      style={{ animationDelay: delay }}
    >
      <div className={`
        relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm
        p-4 sm:p-6 md:p-8 transition-all duration-500 ease-out
        hover:border-white/20 hover:bg-white/[0.05]
        hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.1)]
        animate-fade-in-up
        active:scale-[0.98] sm:active:scale-100
      `}>
        {/* Gradient overlay on hover */}
        <div className={`
          absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent
          opacity-0 transition-opacity duration-500
          ${isHovered ? 'opacity-100' : ''}
        `} />

        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 min-w-0 flex-1">
            {/* Icon container */}
            <div className={`
              flex-shrink-0 flex items-center justify-center 
              w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 
              rounded-lg sm:rounded-xl
              bg-white/[0.05] border border-white/10
              transition-all duration-500
              group-hover:bg-white/10 group-hover:border-white/20
              group-hover:scale-110
            `}>
              <span className="text-white/70 group-hover:text-white transition-colors duration-300">
                {icon}
              </span>
            </div>

            {/* Text content */}
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/40 mb-1 sm:mb-2 font-medium">
                {label}
              </span>
              <span className={`
                block text-sm sm:text-base md:text-lg lg:text-xl font-light text-white/90
                transition-all duration-300 truncate
                group-hover:text-white sm:group-hover:translate-x-1
              `}>
                {value}
              </span>
            </div>
          </div>

          {/* Arrow - hidden on very small screens */}
          <div className={`
            flex-shrink-0 text-white/20 transition-all duration-300
            hidden xs:block
            group-hover:text-white/60 group-hover:translate-x-2
          `}>
            <ArrowIcon />
          </div>
        </div>

        {/* Bottom line accent */}
        <div className={`
          absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-white/0 via-white/40 to-white/0
          transition-all duration-700 ease-out
          ${isHovered ? 'w-full' : 'w-0'}
        `} />
      </div>
    </a>
  );
}

export function Contact() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white pt-20 sm:pt-24 px-4 sm:px-6 md:px-8 lg:px-16 overflow-hidden">
      {/* Background elements - smaller on mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-1/2 sm:-left-1/4 w-[300px] sm:w-[450px] lg:w-[600px] h-[300px] sm:h-[450px] lg:h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/2 sm:-right-1/4 w-[250px] sm:w-[400px] lg:w-[500px] h-[250px] sm:h-[400px] lg:h-[500px] bg-white/[0.015] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-8 sm:py-12 md:py-16 lg:py-24">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 md:mb-16 lg:mb-20 animate-fade-in">
          <span className="inline-block text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 mb-4 sm:mb-6 font-medium">
            {t('contact.tagline')}
          </span>
          
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl uppercase tracking-tight mb-4 sm:mb-6 md:mb-8">
            <span className="block bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
              Contact
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg lg:text-xl max-w-xs sm:max-w-md lg:max-w-lg mx-auto font-light leading-relaxed px-2">
            {t('contact.description')}
          </p>
        </div>

        {/* Contact Cards */}
        <div className="space-y-3 sm:space-y-4">
          <ContactCard
            icon={<MailIcon />}
            label="Email"
            value="henrard.tristan@proton.me"
            href="mailto:henrard.tristan@proton.me"
            delay="100ms"
          />

          <ContactCard
            icon={<InstagramIcon />}
            label="Instagram"
            value="@dyavol_litso"
            href="https://www.instagram.com/dyavol_litso"
            external
            delay="200ms"
          />

          <ContactCard
            icon={<LinkedInIcon />}
            label="LinkedIn"
            value="Tristan Henrard"
            href="https://www.linkedin.com/in/tristan-henrard-2688a6198/"
            external
            delay="300ms"
          />
        </div>

        {/* Footer note */}
        <div className="mt-10 sm:mt-14 md:mt-16 lg:mt-20 text-center animate-fade-in" style={{ animationDelay: '400ms' }}>
          <p className="text-white/30 text-xs sm:text-sm font-light">
            {t('contact.responseTime')}
          </p>
        </div>
      </div>

      {/* Add keyframes via style tag */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
        
        /* Custom breakpoint for very small screens */
        @media (min-width: 400px) {
          .xs\\:block {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}

export default Contact;
