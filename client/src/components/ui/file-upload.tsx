import React, { useState } from "react";
import { FileText, Upload, X, Paperclip, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileAttachment } from "@shared/schema";

interface FileUploadProps {
  relatedId?: number;
  relatedType: string;
  onFilesUploaded?: (files: FileAttachment[]) => void;
  maxFiles?: number;
  existingFiles?: FileAttachment[];
  onDeleteFile?: (fileId: number) => void;
  className?: string;
  label?: string;
}

export function FileUpload({
  relatedId,
  relatedType,
  onFilesUploaded,
  maxFiles = 5,
  existingFiles = [],
  onDeleteFile,
  className = "",
  label = "Attachments"
}: FileUploadProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    // Check if adding new files would exceed the max
    if (existingFiles.length + files.length + e.target.files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload a maximum of ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }
    
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
    
    // Reset the input so the same file can be selected again if needed
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingFile = async (fileId: number) => {
    if (!onDeleteFile) return;
    
    try {
      await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });
      
      onDeleteFile(fileId);
      
      toast({
        title: "File deleted",
        description: "The file was successfully deleted",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    if (!relatedId) {
      toast({
        title: "Cannot upload files",
        description: "Please save the document first before uploading attachments",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append("files", file);
      });
      
      formData.append("relatedId", relatedId.toString());
      formData.append("relatedType", relatedType);
      formData.append("folder", relatedType);
      
      const response = await fetch("/api/files/upload-multiple", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload files");
      }
      
      const uploadedFiles = await response.json();
      
      toast({
        title: "Files uploaded",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
      
      // Clear the files state after successful upload
      setFiles([]);
      
      // Call the callback with the uploaded files
      if (onFilesUploaded) {
        onFilesUploaded(uploadedFiles);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Get file icon based on file type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileIcon className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (mimeType.includes("word") || mimeType.includes("doc")) {
      return <FileText className="h-5 w-5 text-blue-700" />;
    } else if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("xls")) {
      return <FileText className="h-5 w-5 text-green-600" />;
    } else {
      return <Paperclip className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    else return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="fileUpload">{label}</Label>
        <div className="text-xs text-muted-foreground">
          {existingFiles.length + files.length} / {maxFiles} files
        </div>
      </div>

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 bg-gray-50 border rounded-md"
            >
              <div className="flex items-center space-x-2">
                {getFileIcon(file.fileType)}
                <div>
                  <p className="text-sm font-medium truncate max-w-[180px]">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getFileSize(file.fileSize)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(file.fileUrl, "_blank")}
                >
                  <FileText className="h-4 w-4" />
                </Button>
                {onDeleteFile && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteExistingFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Files to be uploaded */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 border rounded-md"
            >
              <div className="flex items-center space-x-2">
                <FileIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[180px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Files"}
          </Button>
        </div>
      )}

      {/* Upload area */}
      {existingFiles.length + files.length < maxFiles && (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center bg-gray-50">
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-center text-gray-500 mb-1">
            Drag and drop or click to upload
          </p>
          <p className="text-xs text-center text-gray-400">
            PDF, Word, Excel, Images up to 10MB
          </p>
          <Input
            id="fileUpload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            type="button"
            onClick={() => document.getElementById("fileUpload")?.click()}
          >
            Select Files
          </Button>
        </div>
      )}
    </div>
  );
}