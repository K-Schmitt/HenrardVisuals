import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  insertRow: vi.fn().mockResolvedValue({ error: null }),
  updateRow: vi.fn().mockResolvedValue({ error: null }),
}));

import { CategoryManager } from './CategoryManager';
import { LanguageProvider } from '@/context/LanguageContext';
import { supabase, insertRow, updateRow } from '@/lib/supabase';
import type { Category } from '@/types';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockInsertRow = insertRow as ReturnType<typeof vi.fn>;
const mockUpdateRow = updateRow as ReturnType<typeof vi.fn>;

const makeCategory = (id: string, name: string): Category => ({
  id, name, slug: name.toLowerCase(), description: null,
  cover_photo_id: null, sort_order: 0, created_at: '',
});

function setupCategories(categories: Category[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: categories, error: null }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  }));
}

const renderManager = () =>
  render(<LanguageProvider><CategoryManager /></LanguageProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  setupCategories([]);
});

describe('CategoryManager', () => {
  it('renders a loading spinner initially', () => {
    renderManager();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the category list after loading', async () => {
    setupCategories([makeCategory('1', 'Editorial'), makeCategory('2', 'Runway')]);
    renderManager();
    await waitFor(() => expect(screen.getByText('Editorial')).toBeInTheDocument());
    expect(screen.getByText('Runway')).toBeInTheDocument();
  });

  it('shows empty state when there are no categories', async () => {
    setupCategories([]);
    renderManager();
    await waitFor(() => expect(screen.getByText('No categories yet')).toBeInTheDocument());
  });

  it('"New Category" button shows the create form', async () => {
    renderManager();
    await waitFor(() => screen.getByText('New Category'));
    fireEvent.click(screen.getByText('New Category'));
    expect(screen.getByText('Create New Category')).toBeInTheDocument();
  });

  it('auto-populates slug when name is typed', async () => {
    renderManager();
    await waitFor(() => screen.getByText('New Category'));
    fireEvent.click(screen.getByText('New Category'));

    const nameInput = screen.getByPlaceholderText('e.g., Editorial, Runway, Polaroids');
    await userEvent.type(nameInput, 'My Category');

    const slugInput = screen.getByPlaceholderText('e.g., editorial') as HTMLInputElement;
    expect(slugInput.value).toBe('my-category');
  });

  it('Save calls insertRow when creating a new category', async () => {
    renderManager();
    await waitFor(() => screen.getByText('New Category'));
    fireEvent.click(screen.getByText('New Category'));

    await userEvent.type(
      screen.getByPlaceholderText('e.g., Editorial, Runway, Polaroids'),
      'Editorial'
    );
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(mockInsertRow).toHaveBeenCalledWith(
        'categories',
        expect.objectContaining({ name: 'Editorial', slug: 'editorial' })
      )
    );
  });

  it('clicking Edit populates the form with category data', async () => {
    setupCategories([makeCategory('1', 'Runway')]);
    renderManager();

    await waitFor(() => screen.getByText('Runway'));
    fireEvent.click(screen.getByTitle('Edit'));

    expect(screen.getByText('Edit Category')).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(
      'e.g., Editorial, Runway, Polaroids'
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('Runway');
  });

  it('Save in edit mode calls updateRow', async () => {
    setupCategories([makeCategory('cat-1', 'Runway')]);
    renderManager();

    await waitFor(() => screen.getByText('Runway'));
    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(mockUpdateRow).toHaveBeenCalledWith(
        'categories',
        'cat-1',
        expect.objectContaining({ name: 'Runway' })
      )
    );
  });

  it('Cancel in two-step delete does not call delete', async () => {
    setupCategories([makeCategory('1', 'Editorial')]);
    renderManager();

    await waitFor(() => screen.getByText('Editorial'));

    mockFrom.mockClear();
    fireEvent.click(screen.getByTitle('Delete'));

    // Confirm/Cancel buttons appear; click Cancel
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));

    // No delete query should have been made
    expect(mockFrom).not.toHaveBeenCalled();
    // Trash button should be restored
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('Confirm in two-step delete calls supabase delete', async () => {
    setupCategories([makeCategory('del-1', 'Runway')]);
    renderManager();

    await waitFor(() => screen.getByText('Runway'));

    fireEvent.click(screen.getByTitle('Delete'));
    expect(screen.getByText('Confirm')).toBeInTheDocument();

    mockFrom.mockClear();
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
  });

  it('success message disappears after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderManager();
    await waitFor(() => screen.getByText('New Category'));
    fireEvent.click(screen.getByText('New Category'));

    await userEvent.type(
      screen.getByPlaceholderText('e.g., Editorial, Runway, Polaroids'),
      'Test'
    );
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => screen.getByText('Category created successfully'));

    act(() => { vi.runAllTimers(); });
    expect(screen.queryByText('Category created successfully')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
