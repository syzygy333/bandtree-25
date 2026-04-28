import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Musician from './Musician';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

describe('Musician', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then not-found state when musician does not exist', async () => {
    client.getEntries.mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter initialEntries={['/musicians/missing-musician']}>
        <Routes>
          <Route path="/musicians/:musicianSlug" element={<Musician />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading musician/i)).toBeInTheDocument();
    expect(await screen.findByText(/musician not found/i)).toBeInTheDocument();
  });

  it('renders connection summary with singular grammar and release link', async () => {
    client.getEntries
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'm1' },
            fields: {
              slug: 'alice-coltrane',
              name: 'Alice Coltrane',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'r1' },
            fields: {
              slug: 'journey-in-satchidananda',
              title: 'Journey in Satchidananda',
              year: 1971,
              musicians: [
                { sys: { id: 'm1' }, fields: { slug: 'alice-coltrane', name: 'Alice Coltrane' } },
                { sys: { id: 'm2' }, fields: { slug: 'pharoah-sanders', name: 'Pharoah Sanders' } },
              ],
            },
          },
        ],
      });

    render(
      <MemoryRouter initialEntries={['/musicians/alice-coltrane']}>
        <Routes>
          <Route path="/musicians/:musicianSlug" element={<Musician />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /alice coltrane/i })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Connected to 1 musician across 1 shared release.')
    ).toBeInTheDocument();

    const releaseLink = screen.getByRole('link', { name: /journey in satchidananda \(1971\)/i });
    expect(releaseLink).toHaveAttribute('href', '/releases/journey-in-satchidananda');
  });

  it('does not render releases section when musician has no associated releases', async () => {
    client.getEntries
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'm1' },
            fields: {
              slug: 'isolated-artist',
              name: 'Isolated Artist',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [],
      });

    render(
      <MemoryRouter initialEntries={['/musicians/isolated-artist']}>
        <Routes>
          <Route path="/musicians/:musicianSlug" element={<Musician />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /isolated artist/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /releases/i })).not.toBeInTheDocument();
  });
});
