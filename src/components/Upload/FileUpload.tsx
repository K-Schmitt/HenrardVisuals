/// <reference types="vite/client" />

import { useState, useRef, useCallback } from 'react';

import { supabase } from '@/lib/supabase';

const UPLOAD_FEEDBACK_TIMEOUT_MS = 3_000;

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  bucket?: string; // Supabase bucket name
}

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  publicUrl: string;
}

export function FileUpload({
  onUploadComplete,
  onError,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 52428800, // 50MB
  multiple = true,
  bucket = 'photos',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    const validateFile = (file: File): string | null => {
      const allowedTypes = accept.split(',').map((t) => t.trim());
      if (!allowedTypes.some((type) => file.type.match(type.replace('*', '.*')))) {
        return `Type "${file.type}" non supporté`;
      }
      if (file.size > maxSize) {
        return `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
      }
      return null;
    };

    setIsUploading(true);
    setUploadProgress([]);

    const uploadedFiles: UploadedFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      setUploadProgress((prev) => [...prev, `Uploading ${file.name}...`]);

      try {
        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${timestamp}-${safeName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          errors.push(`${file.name}: ${error.message}`);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

          uploadedFiles.push({
            name: file.name,
            path: data.path,
            size: file.size,
            publicUrl: urlData.publicUrl,
          });
          setUploadProgress((prev) => [
            ...prev.filter((p) => !p.includes(file.name)),
            `✓ ${file.name} uploaded`,
          ]);
        }
      } catch (err) {
        errors.push(
          `${file.name}: Upload failed - ${err instanceof Error ? err.message : 'Network error'}`
        );
      }
    }

    setIsUploading(false);

    if (uploadedFiles.length > 0) {
      onUploadComplete?.(uploadedFiles);
    }

    if (errors.length > 0) {
      onError?.(errors.join('\n'));
    }

    setTimeout(() => setUploadProgress([]), UPLOAD_FEEDBACK_TIMEOUT_MS);
  }, [accept, maxSize, bucket, onUploadComplete, onError]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const { files } = e.dataTransfer;
      processFiles(files);
    },
    [processFiles]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files) {
      processFiles(files);
    }
    e.target.value = '';
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
                relative p-8 border-2 border-dashed rounded-elegant text-center 
                transition-all duration-300 cursor-pointer
                ${
                  isDragging
                    ? 'border-black bg-gray-50 scale-[1.02]'
                    : 'border-gray-300 hover:border-black hover:bg-gray-50'
                }
                ${isUploading ? 'pointer-events-none opacity-70' : ''}
            `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-black' : 'text-gray-400'}`}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-elegant">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-600 text-body-sm">Uploading...</p>
          </div>
        </div>
      )}

      {!isUploading && (
        <>
          <p className="text-gray-500">
            {isDragging ? (
              <span className="text-black font-medium">Déposez les fichiers ici</span>
            ) : (
              <>
                Glissez-déposez vos photos ici, ou{' '}
                <span className="text-black font-medium underline underline-offset-2">
                  parcourir
                </span>
              </>
            )}
          </p>
          <p className="text-gray-400 text-body-sm mt-2">JPEG, PNG, WebP • Max 50MB</p>
        </>
      )}

      {uploadProgress.length > 0 && (
        <div className="mt-4 text-left space-y-1">
          {uploadProgress.map((msg, i) => (
            <p
              key={i}
              className={`text-body-sm ${msg.startsWith('✓') ? 'text-green-600' : 'text-gray-500'}`}
            >
              {msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
