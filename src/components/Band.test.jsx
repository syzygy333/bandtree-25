import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Band from './Band';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

describe('Band', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then not-found state when band does not exist', async () => {
    client.getEntries.mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter initialEntries={['/bands/missing-band']}>
        <Routes>
          <Route path="/bands/:bandSlug" element={<Band />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading band/i)).toBeInTheDocument();
    expect(await screen.findByText(/band not found/i)).toBeInTheDocument();
  });

  it('renders releases sorted by year descending', async () => {
    client.getEntries
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'band-1' },
            fields: {
              slug: 'boards-of-canada',
              name: 'Boards of Canada',
              releases: [
                { sys: { id: 'r1' }, fields: { slug: 'music-has-the-right', title: 'Music Has The Right To Children', year: 1998 } },
                { sys: { id: 'r2' }, fields: { slug: 'geogaddi', title: 'Geogaddi', year: 2002 } },
                { sys: { id: 'r3' }, fields: { slug: 'tomorrows-harvest', title: "Tomorrow's Harvest", year: 2013 } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'band-1' },
            fields: {
              name: 'Boards of Canada',
              slug: 'boards-of-canada',
              releases: [],
            },
          },
        ],
      });

    render(
      <MemoryRouter initialEntries={['/bands/boards-of-canada']}>
        <Routes>
          <Route path="/bands/:bandSlug" element={<Band />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /boards of canada/i })).toBeInTheDocument();

    const releaseLinks = screen.getAllByRole('link');
    expect(releaseLinks[0]).toHaveTextContent("Tomorrow's Harvest (2013)");
    expect(releaseLinks[1]).toHaveTextContent('Geogaddi (2002)');
    expect(releaseLinks[2]).toHaveTextContent('Music Has The Right To Children (1998)');
  });

  it('renders connected bands section with links when connections exist', async () => {
    const sharedMusician = { sys: { id: 'm1' }, fields: { name: 'Shared Musician' } };

    client.getEntries
      .mockResolvedValueOnce({
        items: [
          {
            sys: { id: 'band-1' },
            fields: {
              slug: 'boards-of-canada',
              name: 'Boards of Canada',
              releases: [],
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
              releases: [
                {
                  sys: { id: 'release-a' },
                  fields: { musicians: [sharedMusician] },
                },
              ],
            },
          },
          {
            sys: { id: 'band-2' },
            fields: {
              slug: 'tycho',
              name: 'Tycho',
              releases: [
                {
                  sys: { id: 'release-b' },
                  fields: { musicians: [sharedMusician] },
                },
              ],
            },
          },
          {
            sys: { id: 'band-3' },
            fields: {
              slug: 'casino-versus-japan',
              name: 'Casino Versus Japan',
              releases: [
                {
                  sys: { id: 'release-c' },
                  fields: { musicians: [sharedMusician] },
                },
              ],
            },
          },
        ],
      });

    render(
      <MemoryRouter initialEntries={['/bands/boards-of-canada']}>
        <Routes>
          <Route path="/bands/:bandSlug" element={<Band />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/connected bands \(2\)/i)).toBeInTheDocument();

    const tychoLink = screen.getByRole('link', { name: 'Tycho' });
    const cvjLink = screen.getByRole('link', { name: 'Casino Versus Japan' });
    expect(tychoLink).toHaveAttribute('href', '/bands/tycho');
    expect(cvjLink).toHaveAttribute('href', '/bands/casino-versus-japan');
  });
});
