import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';

import { PhotoLightbox } from '@/components/PhotoLightbox';
import { LanguageProvider } from '@/context/LanguageContext';
import i18n from '@/i18n';

vi.mock('@/lib/imageUrl', () => ({
  buildImageUrl: (p: string) => `https://cdn.example.com/${p}`,
}));

const photo = {
  id: '1',
  title: 'Editorial 01',
  storage_path: 'a.jpg',
  category: 'editorial',
} as never;

const renderLightbox = (overrides = {}) =>
  render(
    <LanguageProvider>
      <PhotoLightbox
        photo={photo}
        index={0}
        total={3}
        onClose={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        {...overrides}
      />
    </LanguageProvider>
  );

describe('PhotoLightbox', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('is exposed as a modal dialog named after the photo', () => {
    renderLightbox();
    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Editorial 01');
  });

  it('gives every control an accessible name', () => {
    renderLightbox();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('moves focus to the close button on open', () => {
    renderLightbox();
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
  });

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    renderLightbox();

    const buttons = screen.getAllByRole('button');
    await user.tab();
    await user.tab();
    await user.tab();
    // After cycling past the last control, focus returns to the first.
    expect(buttons).toContain(document.activeElement);
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = renderLightbox();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
