import React, { useRef, useState } from 'react';
import { AppwriteService } from '@/services/appwriteService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AlertCircle, Cloud, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';

export interface VenueImageUploaderProps {
  imageUrl: string;
  onChange: (nextUrl: string) => void;
  disabled?: boolean;
}

export const VenueImageUploader: React.FC<VenueImageUploaderProps> = ({
  imageUrl,
  onChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [storageSource, setStorageSource] = useState<'appwrite' | 'local' | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled || isUploading) return;
    setUploadError('');
    setUploadNotice('');
    setIsUploading(true);

    const previousUrl = imageUrl;
    try {
      const result = await AppwriteService.uploadVenueImage(file);
      onChange(result.url);
      setStorageSource(result.source);
      if (result.warning) {
        setUploadNotice(result.warning);
      }
      if (previousUrl && previousUrl !== result.url) {
        void AppwriteService.deleteVenueImage(previousUrl);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload venue image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    if (disabled || isUploading) return;
    const previousUrl = imageUrl;
    onChange('');
    setStorageSource(null);
    setUploadError('');
    setUploadNotice('');
    if (previousUrl) {
      void AppwriteService.deleteVenueImage(previousUrl);
    }
  };

  const isAppwriteUrl = Boolean(imageUrl && imageUrl.includes('/storage/buckets/'));

  return (
    <div className="sm:col-span-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="venue-photo-upload">Venue Photo (Appwrite Storage)</Label>
        {(storageSource === 'appwrite' || isAppwriteUrl) && (
          <Badge variant="success" className="text-[10px]">
            <Cloud className="w-3 h-3" /> Stored in Appwrite
          </Badge>
        )}
        {storageSource === 'local' && !isAppwriteUrl && (
          <Badge variant="secondary" className="text-[10px]">
            Local Cache
          </Badge>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="venue-photo-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled || isUploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="sr-only"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-xl border p-3.5 transition-colors ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-700/80 bg-slate-950/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Preview Box */}
          <div className="w-24 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Venue preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-600" />
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs text-slate-300">
              {isUploading
                ? 'Uploading photo to Appwrite Storage...'
                : 'Upload a JPG, PNG, WebP, or GIF image (max 5 MB), or drag and drop here.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 text-xs"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                {imageUrl ? 'Replace Photo' : 'Upload Photo'}
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || isUploading}
                  onClick={handleRemove}
                  className="h-9 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadNotice && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>{uploadNotice}</span>
        </div>
      )}
    </div>
  );
};
