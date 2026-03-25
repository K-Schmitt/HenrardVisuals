import { useState, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import type { UploadedFile } from '@/types';

interface UseFileUploadOptions {
  accept?: string;
  maxSize?: number;
  bucket?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
}

interface UseFileUploadReturn {
  isUploading: boolean;
  uploadProgress: string[];
  processFiles: (files: FileList | File[]) => Promise<void>;
}

const FEEDBACK_TIMEOUT_MS = 3_000;

export function useFileUpload({
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 52_428_800,
  bucket = 'photos',
  onUploadComplete,
  onError,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);

  const validateFile = useCallback(
    (file: File): string | null => {
      const allowed = accept.split(',').map((t) => t.trim());
      if (!allowed.some((type) => file.type.match(type.replace('*', '.*')))) {
        return `Type "${file.type}" non supporté`;
      }
      if (file.size > maxSize) {
        return `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
      }
      return null;
    },
    [accept, maxSize]
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setUploadProgress([]);

      const uploaded: UploadedFile[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          continue;
        }

        setUploadProgress((prev) => [...prev, `Uploading ${file.name}...`]);

        try {
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${timestamp}-${safeName}`;

          const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

          if (error) {
            errors.push(`${file.name}: ${error.message}`);
          } else {
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
            uploaded.push({ name: file.name, path: data.path, size: file.size, publicUrl: urlData.publicUrl });
            setUploadProgress((prev) => [
              ...prev.filter((p) => !p.includes(file.name)),
              `✓ ${file.name} uploaded`,
            ]);
          }
        } catch (err) {
          errors.push(
            `${file.name}: ${err instanceof Error ? err.message : 'Network error'}`
          );
        }
      }

      setIsUploading(false);

      if (uploaded.length > 0) onUploadComplete?.(uploaded);
      if (errors.length > 0) onError?.(errors.join('\n'));

      setTimeout(() => setUploadProgress([]), FEEDBACK_TIMEOUT_MS);
    },
    [validateFile, bucket, onUploadComplete, onError]
  );

  return { isUploading, uploadProgress, processFiles };
}
