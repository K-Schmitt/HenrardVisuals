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
      // Exact match only. The previous version compiled the accept entry into
      // an unanchored RegExp, so "xximage/jpegyy" passed.
      const allowed = accept.split(',').map((t) => t.trim());
      if (!allowed.includes(file.type)) {
        return `Type "${file.type}" non supporté`;
      }
      if (file.size > maxSize) {
        return `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
      }
      return null;
    },
    [accept, maxSize]
  );

  /** Intrinsic pixel size, read from an object URL. Null if the file will not
   *  decode — the upload still proceeds, the gallery just uses its fallback
   *  aspect ratio for that photo. */
  const readDimensions = (
    file: File
  ): Promise<{ width: number | null; height: number | null }> =>
    new Promise((resolve) => {
      let url: string;
      try {
        url = URL.createObjectURL(file);
      } catch {
        // No object-URL support (non-browser host). Not worth failing over.
        resolve({ width: null, height: null });
        return;
      }
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: null, height: null });
      };
      img.src = url;
    });

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
          // A UUID prefix, not Date.now(). The bucket is public, so an
          // object's URL is its only access control; a millisecond timestamp
          // plus a camera filename like DSC_0001.jpg is brute-forceable,
          // 128 bits of entropy is not.
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${crypto.randomUUID()}-${safeName}`;

          const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

          if (error) {
            errors.push(`${file.name}: ${error.message}`);
          } else {
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
            const { width, height } = await readDimensions(file);
            uploaded.push({
              name: file.name,
              path: data.path,
              size: file.size,
              publicUrl: urlData.publicUrl,
              width,
              height,
            });
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
