import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useLanguage so PhotoGallery doesn't need i18next initialised in tests
vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'fr',
    setLanguage: vi.fn(),
    t: (key: string) => key, // return the key so we can assert on it
  }),
}));

// Mock OptimizedImage and getStorageUrl to avoid Supabase env in tests
vi.mock('@/lib/supabase', () => ({
  getStorageUrl: (path: string) => `https://cdn.example.com/${path}`,
}));

vi.mock('@/components/OptimizedImage', () => ({
  OptimizedImage: ({ alt, onClick }: { alt: string; onClick?: () => void }) => (
    <img alt={alt} onClick={onClick} data-testid="optimized-image" />
  ),
}));

import { PhotoGallery } from './PhotoGallery';

import type { Photo, Category } from '@/types';

const makePhoto = (id: string, category: string | null = null): Photo =>
  ({
    id,
    title: `Photo ${id}`,
    storage_path: `photos/${id}.jpg`,
    is_published: true,
    is_hero: false,
    sort_order: 0,
    category,
    description: null,
    thumbnail_path: null,
    width: null,
    height: null,
    file_size: null,
    mime_type: null,
    metadata: {},
    created_at: '',
    updated_at: '',
  }) as Photo;

const makeCategory = (id: string, name: string, slug: string): Category => ({
  id,
  name,
  slug,
  description: null,
  cover_photo_id: null,
  sort_order: 0,
  created_at: '',
});

const DEFAULT_PROPS = {
  photos: [],
  categories: [],
  activeFilter: 'All',
  onFilterChange: vi.fn(),
  onPhotoClick: vi.fn(),
  isLoading: false,
  error: null,
  currentPage: 0,
  totalCount: 0,
  pageSize: 12,
  onPageChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PhotoGallery', () => {
  it('renders a loading spinner when isLoading is true', () => {
    render(<PhotoGallery {...DEFAULT_PROPS} isLoading={true} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error message and retry button when error is set', () => {
    render(<PhotoGallery {...DEFAULT_PROPS} error="Network error" />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('gallery.retry')).toBeInTheDocument();
  });

  it('renders all photos', () => {
    const photos = [makePhoto('1'), makePhoto('2'), makePhoto('3')];
    render(<PhotoGallery {...DEFAULT_PROPS} photos={photos} />);
    expect(screen.getAllByTestId('optimized-image')).toHaveLength(3);
  });

  it('calls onPhotoClick with the correct photo when clicked', () => {
    const photos = [makePhoto('1'), makePhoto('2')];
    const onPhotoClick = vi.fn();
    render(<PhotoGallery {...DEFAULT_PROPS} photos={photos} onPhotoClick={onPhotoClick} />);

    fireEvent.click(screen.getAllByTestId('optimized-image')[0]);
    expect(onPhotoClick).toHaveBeenCalledWith(photos[0]);
  });

  it('renders filter buttons for each category plus All', () => {
    const categories = [makeCategory('1', 'Editorial', 'editorial'), makeCategory('2', 'Runway', 'runway')];
    render(<PhotoGallery {...DEFAULT_PROPS} categories={categories} />);

    expect(screen.getByText('gallery.all')).toBeInTheDocument();
    expect(screen.getByText('Editorial')).toBeInTheDocument();
    expect(screen.getByText('Runway')).toBeInTheDocument();
  });

  it('calls onFilterChange with slug when a category button is clicked', () => {
    const categories = [makeCategory('1', 'Editorial', 'editorial')];
    const onFilterChange = vi.fn();
    render(<PhotoGallery {...DEFAULT_PROPS} categories={categories} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByText('Editorial'));
    expect(onFilterChange).toHaveBeenCalledWith('editorial');
  });

  it('calls onFilterChange with "All" when the All button is clicked', () => {
    const onFilterChange = vi.fn();
    render(<PhotoGallery {...DEFAULT_PROPS} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByText('gallery.all'));
    expect(onFilterChange).toHaveBeenCalledWith('All');
  });

  it('renders empty state when photos array is empty and not loading', () => {
    render(<PhotoGallery {...DEFAULT_PROPS} photos={[]} />);
    expect(screen.getByText('gallery.empty')).toBeInTheDocument();
  });

  it('does not render pagination when only one page', () => {
    const photos = [makePhoto('1')];
    render(<PhotoGallery {...DEFAULT_PROPS} photos={photos} totalCount={1} pageSize={12} />);

    expect(screen.queryByLabelText('Page précédente')).not.toBeInTheDocument();
  });

  it('renders pagination when totalCount exceeds pageSize', () => {
    render(
      <PhotoGallery {...DEFAULT_PROPS} totalCount={25} pageSize={12} currentPage={0} />
    );
    expect(screen.getByLabelText('Page précédente')).toBeInTheDocument();
    expect(screen.getByLabelText('Page suivante')).toBeInTheDocument();
  });

  it('Previous button is disabled on first page', () => {
    render(
      <PhotoGallery {...DEFAULT_PROPS} totalCount={25} pageSize={12} currentPage={0} />
    );
    expect(screen.getByLabelText('Page précédente')).toBeDisabled();
  });

  it('Next button is disabled on last page', () => {
    render(
      <PhotoGallery {...DEFAULT_PROPS} totalCount={25} pageSize={12} currentPage={2} />
    );
    expect(screen.getByLabelText('Page suivante')).toBeDisabled();
  });

  it('calls onPageChange with next page index when Next is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <PhotoGallery
        {...DEFAULT_PROPS}
        totalCount={25}
        pageSize={12}
        currentPage={0}
        onPageChange={onPageChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Page suivante'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with previous page index when Previous is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <PhotoGallery
        {...DEFAULT_PROPS}
        totalCount={25}
        pageSize={12}
        currentPage={1}
        onPageChange={onPageChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Page précédente'));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });
});
