import { localeOf } from '@/shared/lang/languages';
import { fillTemplate } from './fillTemplate';

export interface FileSizeUnits {
  sizeBytes: string;
  sizeKilobytes: string;
  sizeMegabytes: string;
  sizeGigabytes: string;
}

const STEP = 1024;

export const formatFileSize = (bytes: number, language: string, units: FileSizeUnits) => {
  const size = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const templates = [units.sizeBytes, units.sizeKilobytes, units.sizeMegabytes, units.sizeGigabytes].map((template) => template || '{size}');
  let unit = 0;
  let value = size;
  while (value >= STEP && unit < templates.length - 1) {
    value /= STEP;
    unit += 1;
  }
  const number = new Intl.NumberFormat(localeOf(language), { maximumFractionDigits: unit === 0 || value >= 100 ? 0 : 1 }).format(value);
  return fillTemplate(templates[unit], { size: number });
};
