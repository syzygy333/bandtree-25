import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Releases from './Releases';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

vi.mock('./Search', () => ({
  default: () => <div>Search Component</div>,
}));

describe('Releases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then empty state when no releases are returned', async () => {
    client.getEntries.mockResolvedValue({
      items: [],
      total: 0,
    });

    render(
      <MemoryRouter>
        <Releases />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading releases/i)).toBeInTheDocument();
    expect(await screen.findByText(/no releases found/i)).toBeInTheDocument();
  });

  it('renders singular count copy for one total release', async () => {
    client.getEntries.mockResolvedValue({
      items: [
        {
          fields: {
            slug: 'geogaddi',
            title: 'Geogaddi',
          },
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <Releases />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /releases/i })).toBeInTheDocument();
    expect(screen.getByText(/1 release in the tree/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Geogaddi' })).toHaveAttribute('href', '/releases/geogaddi');
  });

  it('renders search and list links when releases are available', async () => {
    client.getEntries.mockResolvedValue({
      items: [
        {
          fields: {
            slug: 'music-has-the-right-to-children',
            title: 'Music Has The Right To Children',
          },
        },
        {
          fields: {
            slug: 'tomorrows-harvest',
            title: "Tomorrow's Harvest",
          },
        },
      ],
      total: 2,
    });

    render(
      <MemoryRouter>
        <Releases />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /releases/i })).toBeInTheDocument();
    expect(screen.getByText(/2 releases in the tree/i)).toBeInTheDocument();
    expect(screen.getByText(/search component/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /100 most recent updates/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Music Has The Right To Children' }))
      .toHaveAttribute('href', '/releases/music-has-the-right-to-children');
    expect(screen.getByRole('link', { name: "Tomorrow's Harvest" }))
      .toHaveAttribute('href', '/releases/tomorrows-harvest');
  });
});
