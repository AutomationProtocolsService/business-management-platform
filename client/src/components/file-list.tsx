import { useState } from "react";
import { 
  FileText, 
  Download, 
  Trash2, 
  ExternalLink, 
  Edit, 
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatFileSize } from "@/lib/utils";

export interface FileListProps {
  files: Array<{
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
  }>;
  onDelete: (fileId: number) => void;
  className?: string;
}

export default function FileList({ files, onDelete, className = "" }: FileListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<{ id: number, description: string } | null>(null);

  // Handle confirming file deletion
  const handleDeleteConfirm = () => {
    if (fileToDelete !== null) {
      onDelete(fileToDelete);
      setFileToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (fileId: number) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
  };

  // Start editing file description
  const handleEditClick = (fileId: number, description: string | null) => {
    setEditMode({ 
      id: fileId, 
      description: description || "" 
    });
  };

  // Cancel editing file description
  const handleCancelEdit = () => {
    setEditMode(null);
  };

  // Save the edited file description
  const handleSaveEdit = () => {
    // In a real implementation, you would save this to the backend
    // For now we just cancel the edit mode
    setEditMode(null);
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    return <FileText className="h-4 w-4" />;
  };

  // Format the date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (files.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>No files attached</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No files have been uploaded yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Files</CardTitle>
        <CardDescription>Attached documents and files</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium flex items-center space-x-2">
                    {getFileIcon(file.fileType)}
                    <span className="ml-2 max-w-[200px] truncate">
                      {file.fileName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {editMode && editMode.id === file.id ? (
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={editMode.description}
                          onChange={(e) => setEditMode({...editMode, description: e.target.value})}
                          className="h-8"
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm">
                        {file.description || "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(file.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button size="icon" variant="ghost" asChild>
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" asChild>
                        <a 
                          href={file.fileUrl} 
                          download={file.fileName}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleEditClick(file.id, file.description)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDeleteClick(file.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file 
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}