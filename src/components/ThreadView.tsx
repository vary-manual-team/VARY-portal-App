import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, X, Trash2 } from 'lucide-react';
import { getItems, setItems, generateId } from '../lib/storage';

interface ThreadComment {
  id: string;
  projectId: string;
  parentId: string;
  parentType: 'message' | 'asset';
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

interface ThreadViewProps {
  projectId: string;
  parentId: string;
  parentType: 'message' | 'asset';
  parentContent: React.ReactNode;
  onClose: () => void;
}

export default function ThreadView({ projectId, parentId, parentType, parentContent, onClose }: ThreadViewProps) {
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComments = () => {
      const allComments = getItems<ThreadComment>('threadComments');
      const threadComments = allComments
        .filter(c => c.parentId === parentId)
        .sort((a, b) => a.createdAt - b.createdAt);
      
      setComments(threadComments);
      setLoading(false);
    };

    loadComments();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'threadComments') {
        loadComments();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', loadComments);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', loadComments);
    };
  }, [projectId, parentId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const finalAuthorName = authorName.trim() || 'Anonymous';
    
    const newComm: ThreadComment = {
      id: generateId(),
      projectId,
      parentId,
      parentType,
      text: newComment.trim(),
      authorId: 'anonymous',
      authorName: finalAuthorName,
      createdAt: Date.now()
    };

    const allComments = getItems<ThreadComment>('threadComments');
    setItems('threadComments', [...allComments, newComm]);

    // Update replyCount on parent
    const parentKey = parentType === 'message' ? 'messages' : 'assets';
    const allParents = getItems<any>(parentKey);
    const updatedParents = allParents.map((p: any) => 
      p.id === parentId 
        ? { ...p, replyCount: (p.replyCount || 0) + 1 }
        : p
    );
    setItems(parentKey, updatedParents);

    setNewComment('');
    window.dispatchEvent(new Event('local-storage-update'));
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    
    const allComments = getItems<ThreadComment>('threadComments');
    setItems('threadComments', allComments.filter(c => c.id !== commentId));

    // Update replyCount on parent
    const parentKey = parentType === 'message' ? 'messages' : 'assets';
    const allParents = getItems<any>(parentKey);
    const updatedParents = allParents.map((p: any) => 
      p.id === parentId 
        ? { ...p, replyCount: Math.max(0, (p.replyCount || 0) - 1) }
        : p
    );
    setItems(parentKey, updatedParents);

    window.dispatchEvent(new Event('local-storage-update'));
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 w-80 md:w-96 shrink-0">
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
        <h3 className="font-semibold text-zinc-900">Thread</h3>
        <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
          {parentContent}
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center text-zinc-500 py-4 text-sm">Loading thread...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-zinc-500 py-8 text-sm">
              No replies yet. Start the conversation!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex flex-col">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-zinc-900">{comment.authorName}</span>
                    <span className="text-xs text-zinc-500">
                      {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                    title="Delete reply"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                  {comment.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                    part.match(/(https?:\/\/[^\s]+)/g) ? (
                      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {part}
                      </a>
                    ) : (
                      part
                    )
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-200 bg-white">
        <form onSubmit={handleAddComment} className="flex flex-col gap-2">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your Name (Optional)"
            className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Reply..."
              className="flex-1 rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 sm:text-sm p-2 border"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="inline-flex items-center justify-center px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
