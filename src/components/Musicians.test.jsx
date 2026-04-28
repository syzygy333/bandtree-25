import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Musicians from './Musicians';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
    getEntry: vi.fn(),
  },
}));

vi.mock('./Search', () => ({
  default: () => <div>Search Component</div>,
}));

describe('Musicians', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no-musicians state when musician query returns no items', async () => {
    client.getEntries.mockImplementation(({ content_type }) => {
      if (content_type === 'musician') {
        return Promise.resolve({ items: [], total: 0 });
      }

      if (content_type === 'release') {
        return Promise.resolve({ items: [] });
      }

      return Promise.resolve({ items: [] });
    });

    render(
      <MemoryRouter>
        <Musicians />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no musicians found/i)).toBeInTheDocument();
  });

  it('renders no-connected state when musicians exist but no top musician can be computed', async () => {
    client.getEntries.mockImplementation(({ content_type }) => {
      if (content_type === 'musician') {
        return Promise.resolve({
          items: [
            { sys: { id: 'm1' }, fields: { slug: 'alice-coltrane', name: 'Alice Coltrane' } },
          ],
          total: 1,
        });
      }

      if (content_type === 'release') {
        return Promise.resolve({ items: [] });
      }

      return Promise.resolve({ items: [] });
    });

    render(
      <MemoryRouter>
        <Musicians />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no connected musicians found/i)).toBeInTheDocument();
  });

  it('renders top musician and musician list when data is available', async () => {
    client.getEntries.mockImplementation(({ content_type }) => {
      if (content_type === 'musician') {
        return Promise.resolve({
          items: [
            { sys: { id: 'm1' }, fields: { slug: 'alice-coltrane', name: 'Alice Coltrane' } },
            { sys: { id: 'm2' }, fields: { slug: 'pharoah-sanders', name: 'Pharoah Sanders' } },
          ],
          total: 2,
        });
      }

      if (content_type === 'release') {
        return Promise.resolve({
          items: [
            {
              fields: {
                musicians: [
                  { sys: { id: 'm1' } },
                  { sys: { id: 'm2' } },
                ],
              },
            },
          ],
        });
      }

      return Promise.resolve({ items: [] });
    });

    client.getEntry.mockResolvedValue({
      sys: { id: 'm1' },
      fields: { slug: 'alice-coltrane', name: 'Alice Coltrane' },
    });

    render(
      <MemoryRouter>
        <Musicians />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /musicians/i })).toBeInTheDocument();
    expect(screen.getByText(/2 musicians in the tree/i)).toBeInTheDocument();
    expect(screen.getByText(/search component/i)).toBeInTheDocument();

    const aliceLinks = screen.getAllByRole('link', { name: 'Alice Coltrane' });
    expect(aliceLinks).toHaveLength(2);
    expect(aliceLinks[0]).toHaveAttribute('href', '/musicians/alice-coltrane');
    expect(aliceLinks[1]).toHaveAttribute('href', '/musicians/alice-coltrane');
    expect(screen.getByText(/is the most connected musician \(1 connections\)/i)).toBeInTheDocument();

    const secondMusicianLink = screen.getByRole('link', { name: 'Pharoah Sanders' });
    expect(secondMusicianLink).toHaveAttribute('href', '/musicians/pharoah-sanders');
  });
});
