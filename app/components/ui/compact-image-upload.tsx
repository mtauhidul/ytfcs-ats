// app/components/ui/compact-image-upload.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "~/lib/utils";
import { storageService } from "~/services/storageService";
import { toast } from "sonner";

interface CompactImageUploadProps {
  value?: string; // Current image URL
  onChange: (url: string | null) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  clientId?: string; // For organizing uploads
  maxSize?: number; // Max file size in MB
  accept?: string; // Accepted file types
}

export function CompactImageUpload({
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  disabled = false,
  className,
  label = "Client Logo (Optional)",
  clientId = "temp",
  maxSize = 5,
  accept = "image/*"
}: CompactImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      // Validate file
      const validation = await storageService.validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || "Invalid file");
        return;
      }

      // Upload file with progress
      const downloadURL = await storageService.uploadClientLogo(
        file,
        clientId,
        (progress) => setUploadProgress(progress)
      );

      onChange(downloadURL);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
      onChange(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      onUploadEnd?.();
    }
  }, [disabled, onChange, onUploadStart, onUploadEnd, clientId]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    if (disabled || isUploading) return;
    onChange(null);
    toast.success("Logo removed");
  }, [disabled, isUploading, onChange]);

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      
      <div className="flex items-center gap-3">
        {/* Logo Preview */}
        <div className="relative w-16 h-16">
          {value ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200">
              <img
                src={value}
                alt="Client logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = storageService.generatePlaceholderLogo("Client");
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <div 
              className={cn(
                "w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer",
                "hover:border-primary/50 hover:bg-primary/5 transition-colors",
                disabled && "opacity-50 cursor-not-allowed",
                isUploading && "cursor-not-allowed"
              )}
              onClick={handleClick}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={disabled || isUploading}
              className="h-8"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Uploading...
                </>
              ) : value ? (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Change
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </>
              )}
            </Button>
            
            {value && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="h-8 text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            )}
          </div>
          
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-primary h-1 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP up to {maxSize}MB
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
