import { useFileStore } from '@/stores/file.store';
import styles from './StatusBar.module.css';

const STATUS_LABELS: Record<string, string> = {
  new: '未保存',
  saved: '已保存',
  modified: '已修改',
  saving: '保存中...',
  error: '保存失败',
};

export function StatusBar() {
  const status = useFileStore((s) => s.status);

  return (
    <div
      data-testid="status-bar"
      className={`${styles.statusBar} ${styles[`status-${status}`] ?? ''}`}
    >
      <span className={styles.statusText}>{STATUS_LABELS[status] ?? status}</span>
    </div>
  );
}
