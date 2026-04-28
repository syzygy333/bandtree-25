import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Bands from './Bands';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

vi.mock('./Search', () => ({
  default: () => <div>Search Component</div>,
}));

describe('Bands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows no-bands state when query returns no items', async () => {
    client.getEntries.mockResolvedValue({
      items: [],
      total: 0,
    });

    render(
      <MemoryRouter>
        <Bands />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no bands found/i)).toBeInTheDocument();
  });

  it('renders list and shows zero-connection top-band summary when no shared-musician connections exist', async () => {
    client.getEntries.mockResolvedValue({
      items: [
        {
          sys: { id: 'b1' },
          fields: {
            slug: 'boards-of-canada',
            name: 'Boards of Canada',
            releases: [
              {
                fields: {
                  musicians: [{ sys: { id: 'm1' } }],
                },
              },
            ],
          },
        },
        {
          sys: { id: 'b2' },
          fields: {
            slug: 'tycho',
            name: 'Tycho',
            releases: [
              {
                fields: {
                  musicians: [{ sys: { id: 'm2' } }],
                },
              },
            ],
          },
        },
      ],
      total: 2,
    });

    render(
      <MemoryRouter>
        <Bands />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /bands/i })).toBeInTheDocument();
    expect(screen.getByText(/2 bands in the tree/i)).toBeInTheDocument();
    expect(screen.getByText(/search component/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /the most connected band/i })).toBeInTheDocument();
    expect(screen.getByText(/connects to 0 other bands via shared musicians/i)).toBeInTheDocument();
    const boardsLinks = screen.getAllByRole('link', { name: 'Boards of Canada' });
    expect(boardsLinks).toHaveLength(2);
    expect(boardsLinks[0]).toHaveAttribute('href', '/bands/boards-of-canada');
    expect(boardsLinks[1]).toHaveAttribute('href', '/bands/boards-of-canada');
    expect(screen.getByRole('link', { name: 'Tycho' })).toHaveAttribute('href', '/bands/tycho');
  });

  it('renders top-band section when connections exist', async () => {
    const sharedMusician = { sys: { id: 'm-shared' } };

    client.getEntries.mockResolvedValue({
      items: [
        {
          sys: { id: 'b1' },
          fields: {
            slug: 'boards-of-canada',
            name: 'Boards of Canada',
            releases: [
              {
                fields: {
                  musicians: [sharedMusician],
                },
              },
            ],
          },
        },
        {
          sys: { id: 'b2' },
          fields: {
            slug: 'tycho',
            name: 'Tycho',
            releases: [
              {
                fields: {
                  musicians: [sharedMusician],
                },
              },
            ],
          },
        },
      ],
      total: 2,
    });

    render(
      <MemoryRouter>
        <Bands />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /the most connected band/i })).toBeInTheDocument();
    const boardsLinks = screen.getAllByRole('link', { name: 'Boards of Canada' });
    expect(boardsLinks).toHaveLength(2);
    expect(boardsLinks[0]).toHaveAttribute('href', '/bands/boards-of-canada');
    expect(boardsLinks[1]).toHaveAttribute('href', '/bands/boards-of-canada');
    expect(screen.getByText(/connects to 1 other band via shared musicians/i)).toBeInTheDocument();
  });
});
