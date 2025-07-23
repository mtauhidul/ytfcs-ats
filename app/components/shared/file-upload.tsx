// app/components/shared/file-upload.tsx
"use client";

import { AlertCircle, FileText, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { applicationService } from "~/services/applicationService";

interface FileUploadProps {
  onUploadComplete?: (applicationId: string) => void;
  onUploadStart?: () => void;
  disabled?: boolean;
  multiple?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
  applicationId?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadStart,
  disabled = false,
  multiple = true,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Mock file upload to Firebase Storage (in real implementation, use Firebase Storage)
  const uploadToStorage = async (file: File): Promise<string> => {
    // Simulate upload progress
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock URL - in real implementation, this would be the Firebase Storage URL
        resolve(`https://mock-storage.com/${file.name}`);
      }, 2000);
    });
  };

  const processFile = async (file: File, index: number) => {
    try {
      // Validate file
      const validation = applicationService.validateFile(file);
      if (!validation.isValid) {
        setUploadingFiles((prev) =>
          prev.map((item, i) =>
            i === index
              ? { ...item, status: "error", error: validation.error }
              : item
          )
        );
        toast.error(validation.error);
        return;
      }

      onUploadStart?.();

      // Update status to uploading
      setUploadingFiles((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, status: "uploading", progress: 0 } : item
        )
      );

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((item, i) => {
            if (i === index && item.progress < 90) {
              return { ...item, progress: item.progress + 10 };
            }
            return item;
          })
        );
      }, 200);

      // Upload file
      const fileUrl = await uploadToStorage(file);
      clearInterval(progressInterval);

      // Update to processing
      setUploadingFiles((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, status: "processing", progress: 100 } : item
        )
      );

      // Read file content for parsing (mock implementation)
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.readAsText(file);
      });

      // Extract data from resume
      const extractedData = applicationService.parseResumeData(
        file.name,
        fileContent
      );

      // Create application record
      const applicationData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
        extractedData,
        notes: "",
      };

      const applicationId = await applicationService.createApplication(
        applicationData
      );

      // Update to complete
      setUploadingFiles((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, status: "complete", applicationId } : item
        )
      );

      onUploadComplete?.(applicationId);
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadingFiles((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, status: "error", error: "Upload failed" }
            : item
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;

      const newFiles = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Process each file
      acceptedFiles.forEach((file, index) => {
        const actualIndex = uploadingFiles.length + index;
        processFile(file, actualIndex);
      });
    },
    [disabled, uploadingFiles.length]
  );

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
  });

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">
            {isDragActive ? "Drop files here" : "Upload Resume Files"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop resume files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, DOC, DOCX, TXT files up to 10MB
          </p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploading Files</h4>
          {uploadingFiles.map((item, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium truncate max-w-xs">
                      {item.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({(item.file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {item.status === "error" ? (
                  <p className="text-xs text-destructive">{item.error}</p>
                ) : item.status === "complete" ? (
                  <p className="text-xs text-green-600">Upload complete</p>
                ) : item.status === "processing" ? (
                  <p className="text-xs text-blue-600">
                    Processing resume data...
                  </p>
                ) : (
                  <>
                    <Progress value={item.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.progress}% uploaded
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
