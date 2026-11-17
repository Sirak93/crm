import { ElMessage } from 'element-plus';

export const NotificationService = {
  success: (message: string) => ElMessage({ type: 'success', message, showClose: true }),
  error: (message: string) => ElMessage({ type: 'error', message, showClose: true }),
};
