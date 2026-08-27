import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AboutModal } from './AboutModal';

vi.mock('../context', () => ({
  useTheme: () => ({
    theme: 'default',
    customThemes: [],
  }),
}));

describe('AboutModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__APP_VERSION__', '0.4.21');
  });

  it('renders dynamic version number from __APP_VERSION__', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/VERSION V0.4.21/i)).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<AboutModal isOpen={false} onClose={vi.fn()} />);
    expect(container.textContent).toBe('');
  });
});
