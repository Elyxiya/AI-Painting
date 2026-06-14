import type { FC } from 'react';
import { useState } from 'react';
import type { Stage } from 'konva/lib/Stage';
import { exportImage, type ExportFormat, type PixelRatio } from '@/services/exportService';
import styles from './ExportDialog.module.css';

interface ExportDialogProps {
  stage: Stage;
  onClose: () => void;
  onExportSuccess?: (path: string) => void;
  onExportError?: (error: Error) => void;
}

export const ExportDialog: FC<ExportDialogProps> = ({
  stage,
  onClose,
  onExportSuccess,
  onExportError,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [pixelRatio, setPixelRatio] = useState<PixelRatio>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const filename = await exportImage(stage, format, pixelRatio);
      onExportSuccess?.(filename);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出失败';
      setError(errorMessage);
      onExportError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} data-testid="export-dialog">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>导出图片</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="关闭"
            data-testid="btn-close-export"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <label className={styles.label}>格式</label>
            <div className={styles.radioGroup}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="format"
                  value="png"
                  checked={format === 'png'}
                  onChange={() => setFormat('png')}
                  data-testid="format-png"
                />
                <span>PNG</span>
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="format"
                  value="jpeg"
                  checked={format === 'jpeg'}
                  onChange={() => setFormat('jpeg')}
                  data-testid="format-jpeg"
                />
                <span>JPEG</span>
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>分辨率</label>
            <div className={styles.radioGroup}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="ratio"
                  value="1"
                  checked={pixelRatio === 1}
                  onChange={() => setPixelRatio(1)}
                  data-testid="ratio-1x"
                />
                <span>1x ({stage.width()}×{stage.height()})</span>
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="ratio"
                  value="2"
                  checked={pixelRatio === 2}
                  onChange={() => setPixelRatio(2)}
                  data-testid="ratio-2x"
                />
                <span>2x ({stage.width() * 2}×{stage.height() * 2})</span>
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="ratio"
                  value="3"
                  checked={pixelRatio === 3}
                  onChange={() => setPixelRatio(3)}
                  data-testid="ratio-3x"
                />
                <span>3x ({stage.width() * 3}×{stage.height() * 3})</span>
              </label>
            </div>
          </div>

          {error && (
            <div className={styles.error} data-testid="export-error">
              {error}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isExporting}
            data-testid="btn-cancel-export"
          >
            取消
          </button>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={isExporting}
            data-testid="btn-export"
          >
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
