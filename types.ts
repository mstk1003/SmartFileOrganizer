
export type RuleType = 'date' | 'sequence' | 'string';

export interface RulePart {
  id: string;
  type: RuleType;
  value?: string; // For fixed strings
  enabled: boolean;
}

export interface FileItem {
  id: string;
  originalName: string;
  extension: string;
  size: number;
  createdAt: string;
}

export interface PreviewItem extends FileItem {
  newName: string;
  targetPath: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export interface AppSettings {
  sourcePath: string;
  targetPath: string;
  delimiter: string;
  sequenceDigits: number;
}
