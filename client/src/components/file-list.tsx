import { Download, Trash2, FileText, File, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date-utils";

interface FileAttachment {
  id: number;
  description: string | null;
  createdAt: Date;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  relatedId: number | null;
  relatedType: string | null;
  uploadedBy: number | null;
}

interface FileListProps {
  files: FileAttachment[];
  onDelete: (fileId: number) => void;
}

const FileList = ({ files, onDelete }: FileListProps) => {
  if (!files || files.length === 0) {
    return <p className="text-sm text-gray-500">No files attached</p>;
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + ' bytes';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  };

  return (
    <ul className="space-y-2">
      {files.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
          <div className="flex items-center gap-2">
            {getFileIcon(file.fileType)}
            <a 
              href={file.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {file.fileName}
            </a>
            {file.fileSize && (
              <span className="text-xs text-gray-500">
                ({formatFileSize(file.fileSize)})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-2">
              {formatDate(file.createdAt, "MMM dd, yyyy")}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7" 
              onClick={() => window.open(file.fileUrl, '_blank')}
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 text-red-500 hover:text-red-700" 
              onClick={() => onDelete(file.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default FileList;