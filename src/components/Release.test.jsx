import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Release from './Release';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

describe('Release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then not-found state when release does not exist', async () => {
    client.getEntries.mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter initialEntries={['/releases/missing-release']}>
        <Routes>
          <Route path="/releases/:releaseSlug" element={<Release />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading release/i)).toBeInTheDocument();
    expect(await screen.findByText(/release not found/i)).toBeInTheDocument();
  });

  it('renders release details with band and record-label links', async () => {
    client.getEntries
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'release-1' },
            fields: {
              slug: 'geogaddi',
              title: 'Geogaddi',
              year: 2002,
              musicians: [],
              recordLabel: 'Warp Records',
              catalogNumber: 'WARPLP101',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'band-1' },
            fields: {
              slug: 'boards-of-canada',
              name: 'Boards of Canada',
            },
          },
        ],
      });

    render(
      <MemoryRouter initialEntries={['/releases/geogaddi']}>
        <Routes>
          <Route path="/releases/:releaseSlug" element={<Release />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /geogaddi/i })).toBeInTheDocument();

    const bandLink = screen.getByRole('link', { name: /boards of canada/i });
    expect(bandLink).toHaveAttribute('href', '/bands/boards-of-canada');

    const labelLink = screen.getByRole('link', { name: /warp records/i });
    expect(labelLink).toHaveAttribute('href', '/record-labels/warp-records');
    expect(screen.getByText(/\(WARPLP101\)/i)).toBeInTheDocument();
  });

  it('shows unknown label when record label data has no displayable name', async () => {
    client.getEntries
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'release-1' },
            fields: {
              slug: 'untitled',
              title: 'Untitled',
              year: 2020,
              musicians: [],
              recordLabel: {},
            },
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter initialEntries={['/releases/untitled']}>
        <Routes>
          <Route path="/releases/:releaseSlug" element={<Release />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /untitled/i })).toBeInTheDocument();
    expect(screen.getByText(/unknown label/i)).toBeInTheDocument();
  });
});
