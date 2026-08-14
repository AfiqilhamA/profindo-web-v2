/**
 * Validation helpers for input fields and file uploads.
 */

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipe file gambar tidak valid. Gunakan format JPG, PNG, WEBP, atau GIF.`
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Ukuran file gambar melebihi batas ${MAX_FILE_SIZE_MB}MB.`
    };
  }
  return { isValid: true };
}

export function validateDocumentFile(file: File): FileValidationResult {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipe dokumen tidak valid. Gunakan format PDF atau DOC/DOCX.`
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Ukuran dokumen melebihi batas ${MAX_FILE_SIZE_MB}MB.`
    };
  }
  return { isValid: true };
}

export function validateSerialNumber(serial: string): boolean {
  if (!serial || serial.trim().length < 3) {
    return false;
  }
  return true;
}

export function validateDateRange(startDateStr: string, endDateStr: string): boolean {
  if (!startDateStr || !endDateStr) return true;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
}

export function validateProductNumber(value: string): boolean {
  return /^[A-Za-z]{2,5}-\d{1,20}$/.test(value.trim());
}

export function validateYear(value: string | number): boolean {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1800 && year <= new Date().getFullYear();
}
