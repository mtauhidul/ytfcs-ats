// app/components/ui/image-upload.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "~/lib/utils";
import { storageService } from "~/services/storageService";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string; // Current image URL
  onChange: (url: string | null) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  clientId?: string; // For organizing uploads
  maxSize?: number; // Max file size in MB
  accept?: string; // Accepted file types
}

export function ImageUpload({
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  disabled = false,
  className,
  placeholder = "Click to upload image",
  clientId = "temp",
  maxSize = 5,
  accept = "image/*"
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
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
        toast.error(validation.error);
        return;
      }

      // Upload file with progress tracking
      const downloadURL = await storageService.uploadClientLogo(
        file,
        clientId,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      onChange(downloadURL);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      onUploadEnd?.();
    }
  }, [disabled, clientId, onChange, onUploadStart, onUploadEnd]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      toast.error("Please drop an image file");
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback(() => {
    if (disabled || isUploading) return;
    onChange(null);
    toast.success("Image removed");
  }, [disabled, isUploading, onChange]);

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragging && "border-primary bg-primary/10",
          disabled && "opacity-50 cursor-not-allowed",
          isUploading && "cursor-not-allowed",
          value ? "border-solid border-gray-200" : "border-gray-300"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        {value ? (
          // Image preview
          <div className="relative">
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover rounded-lg"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.src = storageService.generatePlaceholderLogo("Client");
              }}
            />
            {!disabled && !isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">{Math.round(uploadProgress)}%</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Upload area
          <div className="p-6 text-center">
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-medium">Uploading...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  {isDragging ? (
                    <Upload className="h-6 w-6 text-primary" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {isDragging ? "Drop image here" : placeholder}
                  </p>
                  <p className="text-muted-foreground">
                    Drag & drop or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP up to {maxSize}MB
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {value && !isUploading && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Image uploaded successfully</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-xs"
            onClick={handleClick}
            disabled={disabled}
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
