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
});
