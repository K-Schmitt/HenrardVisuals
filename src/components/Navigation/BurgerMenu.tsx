/**
 * BurgerMenu Component
 *
 * Two rules of unequal length, as the book sets them. Opening squares them up
 * and crosses them. Driven by transitions rather than keyframes so the global
 * prefers-reduced-motion rule can flatten it, and so the closed state is a
 * resting state rather than the tail of an animation that ran on mount.
 */

import { forwardRef } from 'react';

interface BurgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
  /** Accessible name, supplied by the caller so it goes through i18n. */
  label: string;
  /** id of the drawer this button opens. */
  controls: string;
}

export const BurgerMenu = forwardRef<HTMLButtonElement, BurgerMenuProps>(function BurgerMenu(
  { isOpen, onClick, label, controls },
  ref
) {
  const bar = 'block h-px bg-bone transition-all duration-500 ease-book';

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="relative z-[60] flex h-6 w-7 flex-col justify-center gap-1.5"
      aria-label={label}
      aria-expanded={isOpen}
      aria-controls={controls}
    >
      <span
        aria-hidden="true"
        className={`${bar} ${isOpen ? 'w-7 translate-y-[3.5px] rotate-45' : 'w-7'}`}
      />
      <span
        aria-hidden="true"
        className={`${bar} ${isOpen ? 'w-7 -translate-y-[3.5px] -rotate-45' : 'w-[18px]'}`}
      />
    </button>
  );
});

export default BurgerMenu;
