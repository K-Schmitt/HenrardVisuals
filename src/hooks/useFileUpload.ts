import { useState, useCallback, useRef } from 'react';

import { useLanguage } from '@/context/LanguageContext';
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
/** Upper bound on waiting for a browser to decode one image for its size. */
const DECODE_TIMEOUT_MS = 5_000;

export function useFileUpload({
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 52_428_800,
  bucket = 'photos',
  onUploadComplete,
  onError,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const { t } = useLanguage();

  // Ref, not a dependency: processFiles is handed to a drop zone and should not
  // change identity every time the language does.
  const tRef = useRef(t);
  tRef.current = t;

  const validateFile = useCallback(
    (file: File): string | null => {
      // Exact match only. The previous version compiled the accept entry into
      // an unanchored RegExp, so "xximage/jpegyy" passed.
      const allowed = accept.split(',').map((t) => t.trim());
      if (!allowed.includes(file.type)) {
        return tRef.current('upload.typeUnsupported', { type: file.type });
      }
      if (file.size > maxSize) {
        return tRef.current('upload.tooLarge', { max: Math.round(maxSize / 1024 / 1024) });
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
      let settled = false;

      const finish = (size: { width: number | null; height: number | null }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(size);
      };

      // Neither onload nor onerror is guaranteed to fire — a host that hands
      // out object URLs but never decodes them would otherwise stall the whole
      // upload queue on one file. Dimensions are an optimisation; the upload
      // is not.
      const timer = setTimeout(() => finish({ width: null, height: null }), DECODE_TIMEOUT_MS);

      img.onload = () => finish({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => finish({ width: null, height: null });
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

        setUploadProgress((prev) => [...prev, tRef.current('upload.uploading', { name: file.name })]);

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
              tRef.current('upload.uploaded', { name: file.name }),
            ]);
          }
        } catch (err) {
          errors.push(
            `${file.name}: ${err instanceof Error ? err.message : tRef.current('upload.networkError')}`
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
