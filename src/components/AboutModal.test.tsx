import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('toggles credits view and displays major dependencies including CodeMirror, Excalidraw, and MUI', () => {
    render(<AboutModal isOpen={true} onClose={vi.fn()} />);
    
    // Credits list should not be visible initially
    expect(screen.queryByText(/CodeMirror 6/i)).toBeNull();
    expect(screen.queryByText(/Excalidraw/i)).toBeNull();
    expect(screen.queryByText(/Material UI \(MUI 9\)/i)).toBeNull();

    // Click credits button / row
    const creditsButton = screen.getByRole('button', { name: /Credits & Open Source Dependencies/i });
    fireEvent.click(creditsButton);

    // Dependencies should now be visible
    expect(screen.getByText(/CodeMirror 6/i)).toBeTruthy();
    expect(screen.getByText(/Excalidraw/i)).toBeTruthy();
    expect(screen.getByText(/Material UI \(MUI 9\)/i)).toBeTruthy();
    expect(screen.getByText(/Tauri v2/i)).toBeTruthy();

    // Click again to collapse
    fireEvent.click(creditsButton);
    expect(screen.queryByText(/CodeMirror 6/i)).toBeNull();
  });
});
