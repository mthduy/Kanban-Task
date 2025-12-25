import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface AttachmentUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function AttachmentUpload({
  onFileSelect,
  isLoading = false,
  disabled = false,
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFileSelection(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    onFileSelect(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={disabled || isLoading}
          className="hidden"
          accept="*/*"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="w-6 h-6 text-gray-400" />
          <div className="text-sm text-gray-600">
            {isLoading ? (
              <span>Đang tải lên...</span>
            ) : (
              <>
                <p className="font-medium">Kéo file vào đây hoặc nhấp để chọn</p>
                <p className="text-xs text-gray-500">Tối đa 10MB</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
