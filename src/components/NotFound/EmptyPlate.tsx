import { useLanguage } from '@/context/LanguageContext';

/**
 * Screen 2a's central object: an empty 4:5 frame carrying the corner marks
 * and centre crosshair of a mounting board, the plate number set in Bodoni
 * over the void, and a struck-through technical caption. Same figure syntax
 * as the portfolio frames — a dead end still reads as a page of the book.
 */
export function EmptyPlate() {
  const { t } = useLanguage();

  const corner = 'absolute block h-3 w-3 lg:h-3.5 lg:w-3.5';

  return (
    <figure className="m-0 w-full">
      <div className="relative flex aspect-[4/5] items-center justify-center border border-bone-faint bg-frame">
        <span
          aria-hidden="true"
          className={`${corner} left-[9px] top-[9px] border-l border-t border-bone/40 lg:left-2.5 lg:top-2.5`}
        />
        <span
          aria-hidden="true"
          className={`${corner} right-[9px] top-[9px] border-r border-t border-bone/40 lg:right-2.5 lg:top-2.5`}
        />
        <span
          aria-hidden="true"
          className={`${corner} bottom-[9px] left-[9px] border-b border-l border-bone/40 lg:bottom-2.5 lg:left-2.5`}
        />
        <span
          aria-hidden="true"
          className={`${corner} bottom-[9px] right-[9px] border-b border-r border-bone/40 lg:bottom-2.5 lg:right-2.5`}
        />

        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 block h-px bg-bone/10" />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 block w-px bg-bone/10" />

        {/* The eyebrow beside this frame already announces "Erreur 404";
            reading the numeral out a second time adds nothing. */}
        <span
          aria-hidden="true"
          className="relative font-display text-[clamp(6.5rem,9.2vw,8.25rem)] leading-none tracking-[-0.02em] text-bone/90"
        >
          404
        </span>
      </div>

      <figcaption className="caption-caps mt-3 flex items-baseline justify-between gap-4 text-bone-muted lg:mt-3.5">
        <span className="line-through decoration-vermillon">{t('notFound.plateRef')}</span>
        <span className="text-right">{t('notFound.plateStatus')}</span>
      </figcaption>
    </figure>
  );
}
