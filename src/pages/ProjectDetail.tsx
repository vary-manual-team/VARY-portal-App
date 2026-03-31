import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Send, Archive as ArchiveIcon, MessageSquare, FileImage, MessageCircle, Trash2 } from 'lucide-react';
import ThreadView from '../components/ThreadView';
import { getItems, setItems, generateId } from '../lib/storage';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'lab' | 'archive';
  authorId: string;
  authorName: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

interface Message {
  id: string;
  projectId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  replyCount?: number;
}

interface Asset {
  id: string;
  projectId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  replyCount?: number;
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPromoting, setIsPromoting] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'assets'>('chat');
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  
  // Thread state
  const [activeThread, setActiveThread] = useState<{
    parentId: string;
    parentType: 'message' | 'asset';
    parentContent: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const loadData = () => {
      const allProjects = getItems<Project>('projects');
      const currentProject = allProjects.find(p => p.id === projectId);
      
      if (currentProject) {
        setProject(currentProject);
      } else {
        navigate('/lab');
        return;
      }

      const allMessages = getItems<Message>('messages');
      const projectMessages = allMessages
        .filter(m => m.projectId === projectId)
        .sort((a, b) => a.createdAt - b.createdAt);
      setMessages(projectMessages);

      const allAssets = getItems<Asset>('assets');
      const projectAssets = allAssets
        .filter(a => a.projectId === projectId)
        .sort((a, b) => b.createdAt - a.createdAt);
      setAssets(projectAssets);

      setLoading(false);
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects' || e.key === 'messages' || e.key === 'assets') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates
    window.addEventListener('local-storage-update', loadData);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', loadData);
    };
  }, [projectId, navigate]);

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !project) return;

    const finalAuthorName = authorName.trim() || 'Anonymous';
    
    const newMsg: Message = {
      id: generateId(),
      projectId: project.id,
      text: newMessage.trim(),
      authorId: 'anonymous',
      authorName: finalAuthorName,
      createdAt: Date.now(),
      replyCount: 0
    };

    const allMessages = getItems<Message>('messages');
    setItems('messages', [...allMessages, newMsg]);
    
    setNewMessage('');
    // Trigger local update
    window.dispatchEvent(new Event('local-storage-update'));
  };

  const handlePromote = async () => {
    if (!project || project.status === 'archive') return;
    
    setIsPromoting(true);
    
    const allProjects = getItems<Project>('projects');
    const updatedProjects = allProjects.map(p => 
      p.id === project.id 
        ? { ...p, status: 'archive' as const, updatedAt: Date.now() }
        : p
    );
    
    setItems('projects', updatedProjects);
    
    setIsPromoting(false);
    setShowPromoteModal(false);
    window.dispatchEvent(new Event('local-storage-update'));
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    setIsDeleting(true);
    
    const allProjects = getItems<Project>('projects');
    setItems('projects', allProjects.filter(p => p.id !== project.id));
    
    // Cleanup associated messages and assets
    const allMessages = getItems<Message>('messages');
    setItems('messages', allMessages.filter(m => m.projectId !== project.id));
    
    const allAssets = getItems<Asset>('assets');
    setItems('assets', allAssets.filter(a => a.projectId !== project.id));
    
    // Also cleanup thread comments
    const allComments = getItems<any>('threadComments');
    setItems('threadComments', allComments.filter((c: any) => c.projectId !== project.id));

    navigate('/lab');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    const allMessages = getItems<Message>('messages');
    setItems('messages', allMessages.filter(m => m.id !== messageId));
    
    // Cleanup thread comments for this message
    const allComments = getItems<any>('threadComments');
    setItems('threadComments', allComments.filter((c: any) => c.parentId !== messageId));
    
    window.dispatchEvent(new Event('local-storage-update'));
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    
    const allAssets = getItems<Asset>('assets');
    setItems('assets', allAssets.filter(a => a.id !== asset.id));
    
    // Cleanup thread comments for this asset
    const allComments = getItems<any>('threadComments');
    setItems('threadComments', allComments.filter((c: any) => c.parentId !== asset.id));
    
    window.dispatchEvent(new Event('local-storage-update'));
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setIsUploadingAsset(true);
    try {
      const finalAuthorName = authorName.trim() || 'Anonymous';
      
      // Convert file to base64 for local storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        const newAsset: Asset = {
          id: generateId(),
          projectId: project.id,
          fileUrl: base64String,
          fileName: file.name,
          fileType: file.type,
          authorId: 'anonymous',
          authorName: finalAuthorName,
          createdAt: Date.now(),
          replyCount: 0
        };

        const allAssets = getItems<Asset>('assets');
        setItems('assets', [...allAssets, newAsset]);
        
        setIsUploadingAsset(false);
        e.target.value = '';
        window.dispatchEvent(new Event('local-storage-update'));
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error uploading asset:', error);
      alert('Failed to upload asset. Please try again.');
      setIsUploadingAsset(false);
      e.target.value = '';
    }
  };

  const openThread = (item: Message | Asset, type: 'message' | 'asset') => {
    setActiveThread({
      parentId: item.id,
      parentType: type,
      parentContent: type === 'message' ? (
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-medium text-zinc-900">{item.authorName}</span>
            <span className="text-xs text-zinc-500">
              {item.createdAt ? formatDistanceToNow(item.createdAt, { addSuffix: true }) : 'Just now'}
            </span>
          </div>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{(item as Message).text}</p>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm font-medium text-zinc-900">{item.authorName}</span>
            <span className="text-xs text-zinc-500">
              {item.createdAt ? formatDistanceToNow(item.createdAt, { addSuffix: true }) : 'Just now'}
            </span>
          </div>
          <div className="rounded-lg overflow-hidden border border-zinc-200">
            {/* Simple asset preview */}
            {(item as Asset).fileType.startsWith('image/') ? (
              <img src={(item as Asset).fileUrl} alt={(item as Asset).fileName} className="w-full h-auto" />
            ) : (
              <div className="p-4 bg-zinc-100 flex items-center gap-2">
                <FileImage className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-zinc-700 truncate">{(item as Asset).fileName}</span>
              </div>
            )}
          </div>
        </div>
      )
    });
  };

  if (loading || !project) {
    return <div className="animate-pulse p-8">Loading project details...</div>;
  }

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Promote to Archive?</h3>
            <p className="text-zinc-600 mb-6">
              Are you sure you want to promote "{project.title}" to the Archive? This will mark the project as completed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={isPromoting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isPromoting ? 'Promoting...' : 'Confirm Promote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-2">Delete Project?</h3>
            <p className="text-zinc-600 mb-6">
              Are you sure you want to delete "{project.title}"? This action cannot be undone and will remove all associated messages and assets from view.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Header */}
      <div className="bg-white border-b border-zinc-200 shrink-0">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  project.status === 'archive' 
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'
                }`}>
                  {project.status === 'archive' ? 'Completed' : 'In Progress'}
                </span>
                <span className="text-sm text-zinc-500">
                  Created by {project.authorName}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900">{project.title}</h1>
              <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">
                {project.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
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
            
            {project.status === 'lab' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => setShowPromoteModal(true)}
                  disabled={isPromoting}
                  className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                >
                  <ArchiveIcon className="w-4 h-4" />
                  Promote
                </button>
              </div>
            )}
            {project.status === 'archive' && (
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-4 sm:px-6 flex gap-4 sm:gap-6 border-t border-zinc-100 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'chat' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'assets' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <FileImage className="w-4 h-4" />
            Assets
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex bg-zinc-50">
        
        {/* Chat or Assets View */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-500 py-12">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.authorName === authorName && authorName !== '';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium text-zinc-900">{msg.authorName}</span>
                          <span className="text-xs text-zinc-500">
                            {msg.createdAt ? formatDistanceToNow(msg.createdAt, { addSuffix: true }) : 'Just now'}
                          </span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                          isMe 
                            ? 'bg-zinc-900 text-white rounded-tr-sm' 
                            : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-sm shadow-sm'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm">
                            {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                              part.match(/(https?:\/\/[^\s]+)/g) ? (
                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                                  {part}
                                </a>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <button 
                            onClick={() => openThread(msg, 'message')}
                            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            {msg.replyCount ? `${msg.replyCount} replies` : 'Reply'}
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-xs font-medium text-zinc-400 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
                <form onSubmit={handleAddMessage} className="flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto">
                  <div className="flex gap-3 w-full">
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Name (Opt)"
                      className="w-24 sm:w-40 rounded-xl border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-3 border"
                    />
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Message..."
                      className="flex-1 rounded-xl border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-3 border"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="inline-flex items-center justify-center px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">Project Assets</h2>
                <div className="relative">
                  <input
                    type="file"
                    id="asset-upload"
                    className="hidden"
                    onChange={handleAssetUpload}
                    disabled={isUploadingAsset}
                  />
                  <label
                    htmlFor="asset-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-sm text-sm font-medium cursor-pointer ${isUploadingAsset ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploadingAsset ? 'Uploading...' : 'Upload Asset'}
                  </label>
                </div>
              </div>

              {assets.length === 0 ? (
                <div className="text-center text-zinc-500 py-12 flex-1 flex items-center justify-center">
                  No assets uploaded yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {assets.map((asset) => (
                    <div key={asset.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
                      <div className="aspect-square bg-zinc-100 relative group">
                        {asset.fileType.startsWith('image/') ? (
                          <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileImage className="w-12 h-12 text-zinc-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openThread(asset, 'asset')}
                            className="p-2 bg-white text-zinc-900 rounded-lg text-sm font-medium shadow-sm hover:bg-zinc-100 transition-colors"
                            title="Discuss"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-2 bg-white text-red-600 rounded-lg text-sm font-medium shadow-sm hover:bg-red-50 transition-colors"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-zinc-900 truncate" title={asset.fileName}>{asset.fileName}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-500 truncate">{asset.authorName}</p>
                          {asset.replyCount ? (
                            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {asset.replyCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thread Sidebar */}
        {activeThread && (
          <ThreadView
            projectId={project.id}
            parentId={activeThread.parentId}
            parentType={activeThread.parentType}
            parentContent={activeThread.parentContent}
            onClose={() => setActiveThread(null)}
          />
        )}
      </div>
    </div>
  );
}

