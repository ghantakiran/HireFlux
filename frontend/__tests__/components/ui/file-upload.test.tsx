import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '@/components/ui/file-upload';

function createFile(name: string, size: number, type: string) {
  const file = new File(['a'.repeat(size)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('FileUpload', () => {
  it('invokes onFileSelected on choose', async () => {
    const handle = jest.fn();
    render(<FileUpload onFileSelected={handle} accept=".pdf" />);
    const input = screen.getByLabelText(/file upload/i).parentElement?.querySelector('input[type=file]') as HTMLInputElement;
    const file = createFile('resume.pdf', 1024, 'application/pdf');
    const dt = { files: [file] } as unknown as FileList;
    fireEvent.change(input, { target: { files: dt } });
    await waitFor(() => expect(handle).toHaveBeenCalled());
  });

  it('shows error for too large file', () => {
    render(<FileUpload maxSizeMb={1} />);
    const input = screen.getByLabelText(/file upload/i).parentElement?.querySelector('input[type=file]') as HTMLInputElement;
    const big = createFile('big.bin', 3 * 1024 * 1024, 'application/octet-stream');
    const dt = { files: [big] } as unknown as FileList;
    fireEvent.change(input, { target: { files: dt } });
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });
});


