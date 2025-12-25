import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import attachmentService, { type Attachment } from '@/services/attachmentService';
import { formatTimeAgo } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (attachmentId: string) => void;
  isDeleting?: string | null;
  canDelete?: boolean;
}

export default function AttachmentList({
  attachments,
  onDelete,
  isDeleting = null,
  canDelete = true,
}: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Chưa có tệp đính kèm
      </div>
    );
  }

  const handleDownload = (attachment: Attachment) => {
    try {
      attachmentService.downloadAttachment(attachment.fileUrl, attachment.fileName);
      toast.success(`Đang tải ${attachment.fileName}`);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Lỗi khi tải tệp');
    }
  };

  const handleDelete = (attachmentId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tệp này?')) {
      onDelete(attachmentId);
    }
  };

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment._id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0 text-xl">
              {attachmentService.getFileIcon(attachment.fileType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.fileName}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{attachmentService.formatFileSize(attachment.fileSize)}</span>
                {attachment.createdAt && (
                  <>
                    <span>•</span>
                    <span>{formatTimeAgo(new Date(attachment.createdAt))}</span>
                  </>
                )}
                {attachment.uploadedBy && (
                  <>
                    <span>•</span>
                    <span>
                      Bởi {attachment.uploadedBy.displayName || attachment.uploadedBy.username}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment)}
              title="Tải xuống"
              className="h-8 w-8 p-0"
            >
              <Download className="w-4 h-4" />
            </Button>

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(attachment._id)}
                disabled={isDeleting === attachment._id}
                title="Xóa tệp"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting === attachment._id ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
