import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive as ArchiveIcon, ExternalLink, Plus, Trash2 } from 'lucide-react';
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

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  createdAt: number;
}

export default function Archive() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceDesc, setNewResourceDesc] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  useEffect(() => {
    const loadData = () => {
      const allProjects = getItems<Project>('projects');
      const archiveProjects = allProjects
        .filter(p => p.status === 'archive')
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setProjects(archiveProjects);
      setLoadingProjects(false);

      const allResources = getItems<Resource>('resources');
      const sortedResources = allResources.sort((a, b) => b.createdAt - a.createdAt);
      setResources(sortedResources);
      setLoadingResources(false);
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;

    const newResource: Resource = {
      id: generateId(),
      title: newResourceTitle.trim(),
      description: newResourceDesc.trim(),
      url: newResourceUrl.trim(),
      createdAt: Date.now()
    };

    const allResources = getItems<Resource>('resources');
    const updatedResources = [newResource, ...allResources];
    setItems('resources', updatedResources);
    
    setResources(updatedResources);
    setNewResourceTitle('');
    setNewResourceDesc('');
    setNewResourceUrl('');
    setIsAddingResource(false);
  };

  const handleDeleteResource = (e: React.MouseEvent, resourceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    
    const allResources = getItems<Resource>('resources');
    const updatedResources = allResources.filter(r => r.id !== resourceId);
    setItems('resources', updatedResources);
    setResources(updatedResources);
  };

  if (loadingProjects || loadingResources) {
    return <div className="animate-pulse">Loading Archive...</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">Archive</h1>
        <p className="text-sm md:text-base text-zinc-500 mt-1 md:mt-2">Completed projects and official resources.</p>
      </header>

      {/* Official Resources */}
      <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-zinc-500" />
            Official Resources
          </h2>
          <button
            onClick={() => setIsAddingResource(!isAddingResource)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </div>

        {isAddingResource && (
          <form onSubmit={handleAddResource} className="mb-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">URL</label>
                <input
                  type="url"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newResourceDesc}
                  onChange={(e) => setNewResourceDesc(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 shadow-sm focus:border-zinc-500 focus:ring-zinc-500 text-base sm:text-sm p-2 border"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingResource(false)}
                className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800"
              >
                Add Resource
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.length === 0 ? (
            <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
              No official resources added yet.
            </div>
          ) : (
            resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-medium text-zinc-900 group-hover:text-blue-600 transition-colors truncate">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-zinc-500 mt-1 truncate">{resource.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => handleDeleteResource(e, resource.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                    title="Delete resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ExternalLink className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </a>
            ))
          )}
        </div>
      </section>

      {/* Archived Projects */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Completed Projects</h2>
        <div className="flex flex-col gap-4">
          {projects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-300">
              <ArchiveIcon className="mx-auto h-12 w-12 text-zinc-400" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">No archived projects</h3>
              <p className="mt-1 text-sm text-zinc-500">Projects promoted from the Lab will appear here.</p>
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
                      <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                        {project.title}
                      </h3>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                        Completed
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 line-clamp-3 mb-4">
                      {project.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                        part.match(/(https?:\/\/[^\s]+)/g) ? (
                          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
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
      </section>
    </div>
  );
}
