
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getTodayStr = (): string => {
  const now = new Date();
  return now.getFullYear().toString() + 
         (now.getMonth() + 1).toString().padStart(2, '0') + 
         now.getDate().toString().padStart(2, '0');
};
