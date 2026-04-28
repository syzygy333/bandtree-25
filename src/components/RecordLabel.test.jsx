import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RecordLabel from './RecordLabel';
import client from '../contentfulClient';

vi.mock('../contentfulClient', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

describe('RecordLabel', () => {
  it('shows empty state when no releases match route slug', async () => {
    client.getEntries.mockResolvedValue({
      items: [
        {
          sys: { id: '1' },
          fields: {
            slug: 'selected-ambient-works',
            title: 'Selected Ambient Works',
            year: 1992,
            recordLabel: 'Warp Records',
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/record-labels/nonexistent-label']}>
        <Routes>
          <Route path="/record-labels/:recordLabelSlug" element={<RecordLabel />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading record label/i)).toBeInTheDocument();
    expect(await screen.findByText(/no releases found for this record label/i)).toBeInTheDocument();
  });

  it('renders only releases matching the label slug', async () => {
    client.getEntries.mockResolvedValue({
      items: [
        {
          sys: { id: '1' },
          fields: {
            slug: 'selected-ambient-works',
            title: 'Selected Ambient Works',
            year: 1992,
            recordLabel: 'Warp Records',
          },
        },
        {
          sys: { id: '2' },
          fields: {
            slug: 'music-has-the-right-to-children',
            title: 'Music Has The Right To Children',
            year: 1998,
            recordLabel: 'Warp Records',
          },
        },
        {
          sys: { id: '3' },
          fields: {
            slug: 'dummy',
            title: 'Dummy',
            year: 1994,
            recordLabel: 'Go! Beat',
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/record-labels/warp-records']}>
        <Routes>
          <Route path="/record-labels/:recordLabelSlug" element={<RecordLabel />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /warp records/i })).toBeInTheDocument();
    expect(screen.getByText(/2 releases attributed to this label/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /selected ambient works \(1992\)/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /music has the right to children \(1998\)/i })).toBeInTheDocument();
    expect(screen.queryByText(/dummy/i)).not.toBeInTheDocument();
  });

  it('uses singular release wording when exactly one release matches', async () => {
    client.getEntries.mockResolvedValue({
      items: [
        {
          sys: { id: '1' },
          fields: {
            slug: 'selected-ambient-works',
            title: 'Selected Ambient Works',
            year: 1992,
            recordLabel: 'Warp Records',
          },
        },
        {
          sys: { id: '2' },
          fields: {
            slug: 'dummy',
            title: 'Dummy',
            year: 1994,
            recordLabel: 'Go! Beat',
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/record-labels/warp-records']}>
        <Routes>
          <Route path="/record-labels/:recordLabelSlug" element={<RecordLabel />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/1 release attributed to this label/i)).toBeInTheDocument();
  });

  it('falls back to a human-readable heading from the route slug when no matches exist', async () => {
    client.getEntries.mockResolvedValue({
      items: [],
    });

    render(
      <MemoryRouter initialEntries={['/record-labels/hyperdub-recordings']}>
        <Routes>
          <Route path="/record-labels/:recordLabelSlug" element={<RecordLabel />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /hyperdub recordings/i })).toBeInTheDocument();
    expect(screen.getByText(/no releases found for this record label/i)).toBeInTheDocument();
  });
});
