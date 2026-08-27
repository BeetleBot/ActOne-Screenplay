import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BugReportModal } from './BugReportModal';
import * as bugReportUtil from '../utils/bugReport';

vi.mock('../utils/errorReport', () => ({
  getSystemDiagnostics: () => ({
    os: 'linux',
    osVersion: 'Arch Linux',
    architecture: 'x86_64',
    cpuModel: 'AMD Ryzen',
    cpuCount: 8,
    totalMemoryMb: 16384,
    availableMemoryMb: 8192,
    userAgent: 'WebKitGTK',
    language: 'en-US',
    online: true,
    hardwareConcurrency: 8,
    deviceMemoryGb: 16,
    viewport: '1920x1080',
  }),
  getAppVersion: () => '0.4.21',
}));

describe('BugReportModal Component', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<BugReportModal isOpen={false} onClose={onClose} />);
    expect(container.textContent).toBe('');
  });

  it('renders form inputs and privacy notice when open', () => {
    render(<BugReportModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/REPORT A BUG/i)).toBeTruthy();
    expect(screen.getByText(/Send Bug Report to Developer/i)).toBeTruthy();
    expect(screen.getByLabelText(/Your Name/i)).toBeTruthy();
    expect(screen.getByLabelText(/Contact Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Discord Username/i)).toBeTruthy();
    expect(screen.getByLabelText(/Explain the bug/i)).toBeTruthy();
    expect(screen.getByText(/No screenplay text, dialogue, character names, or story files are ever collected/i)).toBeTruthy();
  });

  it('allows toggling system details', () => {
    render(<BugReportModal isOpen={true} onClose={onClose} />);
    const toggleButton = screen.getByRole('button', { name: /View auto-detected details/i });
    expect(toggleButton).toBeTruthy();
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Arch Linux/i)).toBeTruthy();
  });

  it('submits bug report successfully and shows confirmation', async () => {
    const sendSpy = vi.spyOn(bugReportUtil, 'sendBugReport').mockResolvedValue({
      success: true,
      code: 'BUG-0.4.21-TEST-1234',
    });

    render(<BugReportModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/Contact Email/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/Discord Username/i), { target: { value: '@alice' } });
    fireEvent.change(screen.getByLabelText(/Explain the bug/i), { target: { value: 'Button does not respond.' } });

    const submitBtn = screen.getByRole('button', { name: /Send Bug Report/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
        discordUsername: '@alice',
        description: 'Button does not respond.',
      });
      expect(screen.getByText('Bug Report Submitted')).toBeTruthy();
      expect(screen.getByText('BUG-0.4.21-TEST-1234')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Done/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
