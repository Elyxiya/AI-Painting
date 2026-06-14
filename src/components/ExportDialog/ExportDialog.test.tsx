import type { Stage } from 'konva/lib/Stage';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ExportDialog } from './ExportDialog';

// Mock exportImage function
const mockExportImage = vi.fn();

vi.mock('@/services/exportService', () => ({
  exportImage: (...args: unknown[]) => mockExportImage(...args),
}));

describe('ExportDialog', () => {
  const mockStage = {
    width: () => 1920,
    height: () => 1080,
  } as Stage;

  const defaultProps = {
    stage: mockStage,
    onClose: vi.fn(),
    onExportSuccess: vi.fn(),
    onExportError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExportImage.mockReturnValue('/path/to/exported.png');
  });

  it('renders format selection (PNG/JPEG)', () => {
    render(<ExportDialog {...defaultProps} />);

    expect(screen.getByTestId('format-png')).toBeInTheDocument();
    expect(screen.getByTestId('format-jpeg')).toBeInTheDocument();
  });

  it('renders pixel ratio selection (1x/2x/3x)', () => {
    render(<ExportDialog {...defaultProps} />);

    expect(screen.getByTestId('ratio-1x')).toBeInTheDocument();
    expect(screen.getByTestId('ratio-2x')).toBeInTheDocument();
    expect(screen.getByTestId('ratio-3x')).toBeInTheDocument();
  });

  it('defaults to PNG format', () => {
    render(<ExportDialog {...defaultProps} />);
    expect(screen.getByTestId('format-png')).toBeChecked();
  });

  it('defaults to 1x pixel ratio', () => {
    render(<ExportDialog {...defaultProps} />);
    expect(screen.getByTestId('ratio-1x')).toBeChecked();
  });

  it('displays canvas dimensions in 1x ratio label', () => {
    render(<ExportDialog {...defaultProps} />);
    expect(screen.getByText('1x (1920×1080)')).toBeInTheDocument();
  });

  it('displays canvas dimensions in 2x ratio label', () => {
    render(<ExportDialog {...defaultProps} />);
    expect(screen.getByText('2x (3840×2160)')).toBeInTheDocument();
  });

  it('displays canvas dimensions in 3x ratio label', () => {
    render(<ExportDialog {...defaultProps} />);
    expect(screen.getByText('3x (5760×3240)')).toBeInTheDocument();
  });

  it('calls exportImage with correct parameters on export', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    expect(mockExportImage).toHaveBeenCalledWith(mockStage, 'png', 1);
  });

  it('calls exportImage with JPEG format when selected', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('format-jpeg'));
    await user.click(screen.getByTestId('btn-export'));

    expect(mockExportImage).toHaveBeenCalledWith(mockStage, 'jpeg', 1);
  });

  it('calls exportImage with 2x ratio when selected', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('ratio-2x'));
    await user.click(screen.getByTestId('btn-export'));

    expect(mockExportImage).toHaveBeenCalledWith(mockStage, 'png', 2);
  });

  it('calls exportImage with 3x ratio when selected', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('ratio-3x'));
    await user.click(screen.getByTestId('btn-export'));

    expect(mockExportImage).toHaveBeenCalledWith(mockStage, 'png', 3);
  });

  it('calls onClose when export succeeds', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    await vi.waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('calls onExportSuccess with path when export succeeds', async () => {
    const user = userEvent.setup();
    mockExportImage.mockReturnValueOnce('/path/to/drawing.png');
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    await vi.waitFor(() => {
      expect(defaultProps.onExportSuccess).toHaveBeenCalledWith('/path/to/drawing.png');
    });
  });

  it('displays error message when export fails', async () => {
    const user = userEvent.setup();
    mockExportImage.mockImplementationOnce(() => {
      throw new Error('保存失败');
    });
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    await vi.waitFor(() => {
      expect(screen.getByTestId('export-error')).toHaveTextContent('保存失败');
    });
  });

  it('calls onExportError when export fails', async () => {
    const user = userEvent.setup();
    const error = new Error('导出错误');
    mockExportImage.mockImplementationOnce(() => {
      throw error;
    });
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    await vi.waitFor(() => {
      expect(defaultProps.onExportError).toHaveBeenCalledWith(error);
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-cancel-export'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('export-dialog'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows "导出中..." text while exporting', async () => {
    const user = userEvent.setup();
    let resolveExport!: (value: string) => void;
    mockExportImage.mockImplementationOnce(
      () => new Promise<string>((resolve) => {
        resolveExport = resolve;
      }),
    );
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    expect(screen.getByTestId('btn-export')).toHaveTextContent('导出中...');

    resolveExport('/path/to/file.png');
  });

  it('disables buttons while exporting', async () => {
    const user = userEvent.setup();
    let resolveExport!: (value: string) => void;
    mockExportImage.mockImplementationOnce(
      () => new Promise<string>((resolve) => {
        resolveExport = resolve;
      }),
    );
    render(<ExportDialog {...defaultProps} />);

    await user.click(screen.getByTestId('btn-export'));

    expect(screen.getByTestId('btn-export')).toBeDisabled();
    expect(screen.getByTestId('btn-cancel-export')).toBeDisabled();

    resolveExport('/path/to/file.png');
  });
});
