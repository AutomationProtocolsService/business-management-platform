import React, { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface LogoUploaderProps {
  currentLogoUrl?: string | null;
  onUploadSuccess?: (logoUrl: string) => void;
}

export function LogoUploader({ currentLogoUrl, onUploadSuccess }: LogoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Logo uploaded successfully",
        description: "Your company logo has been updated.",
      });
      
      // Invalidate company settings cache to refresh the logo
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
      
      // Clear selected file and preview
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Call success callback if provided
      if (onUploadSuccess) {
        onUploadSuccess(data.logoUrl);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/settings/logo', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logo deleted successfully",
        description: "Your company logo has been removed.",
      });
      
      // Invalidate company settings cache to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete logo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Company Logo
        </CardTitle>
        <CardDescription>
          Upload your company logo to appear on quotes, invoices, and purchase orders.
          Recommended size: 400x100px or smaller. Maximum file size: 2MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current logo display */}
        {currentLogoUrl && !previewUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Current Logo:</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
            <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <img 
                src={currentLogoUrl} 
                alt="Current company logo" 
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* File selection and preview */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {previewUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Preview:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50">
                <img 
                  src={previewUrl} 
                  alt="Logo preview" 
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleButtonClick}
                  disabled={uploadMutation.isPending}
                >
                  Choose Different File
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleButtonClick}
              className="w-full h-32 border-2 border-dashed hover:border-blue-300 hover:bg-blue-50"
              disabled={uploadMutation.isPending}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  <p className="font-medium">
                    {currentLogoUrl ? 'Upload New Logo' : 'Upload Logo'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Click to select an image file
                  </p>
                </div>
              </div>
            </Button>
          )}
        </div>

        {/* File info */}
        {selectedFile && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>Selected: {selectedFile.name}</p>
            <p>Size: {(selectedFile.size / 1024).toFixed(1)} KB</p>
            <p>Type: {selectedFile.type}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}