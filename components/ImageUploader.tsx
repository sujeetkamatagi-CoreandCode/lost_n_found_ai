'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/context/ToastContext';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  helperText?: string;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 4,
  label = 'Item Photographs',
  helperText = 'Upload clear photos showing any identifiable markings, scratches, or stickers.',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      showToast(`Maximum ${maxImages} images allowed`, {
        type: 'error',
        message: `You can only upload up to ${maxImages} images in total.`,
      });
      return;
    }

    setIsProcessing(true);
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        showToast('Invalid file type', {
          type: 'error',
          message: `${file.name} is not an image.`,
        });
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('File too large', {
          type: 'error',
          message: `${file.name} exceeds the 5MB limit.`,
        });
        continue;
      }

      try {
        const base64 = await readFileAsDataUrl(file);
        newImages.push(base64);
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    onChange([...images, ...newImages]);
    setIsProcessing(false);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-200">{label}</label>
        <span className="text-xs text-slate-400">
          {images.length} / {maxImages} uploaded
        </span>
      </div>

      {helperText && <p className="text-xs text-slate-400">{helperText}</p>}

      {/* Grid of uploaded previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 aspect-square shadow-md"
            >
              <img
                src={url}
                alt={`Upload preview ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-slate-300 hover:text-rose-400 hover:bg-slate-900 border border-slate-700/50 shadow transition-all opacity-90 group-hover:opacity-100"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                <span className="text-indigo-400 underline decoration-indigo-400/50 underline-offset-2">
                  Click to upload
                </span>{' '}
                or drag & drop
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
