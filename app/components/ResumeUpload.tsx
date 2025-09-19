import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ResumeUploadProps {
  onUploadComplete: () => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPreviewFile(file);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file only',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const uploadResume = async () => {
    if (!previewFile || !user) return;

    setUploading(true);
    try {
      const fileExt = previewFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, previewFile);

      if (uploadError) throw uploadError;

      // Insert resume record
      const { error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: previewFile.name,
          file_path: fileName,
          file_size: previewFile.size,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'Resume uploaded successfully!',
      });

      setPreviewFile(null);
      onUploadComplete();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setPreviewFile(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {!previewFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag & drop your PDF resume here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-medium">{previewFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={uploadResume} disabled={uploading} className="flex-1">
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </Button>
              <Button variant="outline" onClick={removeFile} disabled={uploading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResumeUpload;