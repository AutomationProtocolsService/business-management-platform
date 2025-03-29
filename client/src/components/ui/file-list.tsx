import { FileText, Paperclip, File as FileIcon, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileAttachment } from "@shared/schema";

interface FileListProps {
  files: FileAttachment[];
  onDeleteFile?: (fileId: number) => void;
  className?: string;
  emptyMessage?: string;
}

export function FileList({
  files,
  onDeleteFile,
  className = "",
  emptyMessage = "No files attached"
}: FileListProps) {
  const { toast } = useToast();

  const handleDeleteFile = async (fileId: number) => {
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

  if (files.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {files.map((file) => (
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
              title="View file"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onDeleteFile && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                onClick={() => handleDeleteFile(file.id)}
                title="Delete file"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}