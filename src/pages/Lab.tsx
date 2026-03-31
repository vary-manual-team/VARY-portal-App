import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Image as ImageIcon } from 'lucide-react';
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

export default function Lab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const loadProjects = () => {
      const allProjects = getItems<Project>('projects');
      const labProjects = allProjects
        .filter(p => p.status === 'lab')
        .sort((a, b) => b.createdAt - a.createdAt);
      setProjects(labProjects);
      setLoading(false);
    };

    loadProjects();
    // Listen for storage changes in other tabs
    window.addEventListener('storage', loadProjects);
    return () => window.removeEventListener('storage', loadProjects);
  }, []);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const finalAuthorName = authorName.trim() || 'Anonymous';
    const now = Date.now();

    const newProject: Project = {
      id: generateId(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: 'lab',
      authorId: 'anonymous',
      authorName: finalAuthorName,
      ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      createdAt: now,
      updatedAt: now
    };

    const allProjects = getItems<Project>('projects');
    const updatedProjects = [...allProjects, newProject];
    setItems('projects', updatedProjects);
    
    // Update local state
    setProjects(updatedProjects.filter(p => p.status === 'lab').sort((a, b) => b.createdAt - a.createdAt));

    setNewTitle('');
    setNewDesc('');
    setAuthorName('');
    setImageUrl('');
    setIsCreating(false);
  };

  if (loading) {
    return <div className="animate-pulse">Loading Lab projects...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">Lab</h1>
          <p className="text-sm md:text-base text-zinc-500 mt-1 md:mt-2">In-progress projects and prototypes.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-sm font-medium w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </header>

      {isCreating && (
        <form onSubmit={handleCreateProject} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Create New Project</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700">Project Title</label>
              <input
                type="text"
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
                required
              />
            </div>
            <div>
              <label htmlFor="authorName" className="block text-sm font-medium text-zinc-700">Your Name (Optional)</label>
              <input
                type="text"
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Anonymous"
                className="mt-1 block w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700">Description / URL</label>
              <textarea
                id="description"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe the project or paste a URL..."
                className="mt-1 block w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
                required
              />
            </div>
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-zinc-700">Cover Image URL (Optional)</label>
              <div className="mt-1 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                <input
                  type="url"
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="block w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {projects.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-300">
            <FolderOpen className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-2 text-sm font-semibold text-zinc-900">No projects</h3>
            <p className="mt-1 text-sm text-zinc-500">Get started by creating a new project.</p>
          </div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden active:scale-[0.98] transition-all hover:border-zinc-300 flex flex-col sm:flex-row"
            >
              {project.imageUrl && (
                <div className="sm:w-48 h-48 sm:h-auto shrink-0 overflow-hidden bg-zinc-100">
                  <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {project.title}
                    </h3>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                      Lab
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-3 mb-4">
                    {project.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                      part.match(/(https?:\/\/[^\s]+)/g) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                          {part}
                        </a>
                      ) : (
                        part
                      )
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-auto">
                  <span className="text-xs font-medium text-zinc-500">By {project.authorName}</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
