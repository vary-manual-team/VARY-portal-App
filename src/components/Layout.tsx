import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { FlaskConical, Archive as ArchiveIcon } from 'lucide-react';
import { clsx } from 'clsx';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/lab', label: 'Lab', icon: FlaskConical },
    { path: '/archive', label: 'Archive', icon: ArchiveIcon },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-50">
      {/* Mobile Header */}
      <header className="md:hidden h-14 bg-white border-b border-zinc-200 flex items-center px-4 shrink-0 sticky top-0 z-10">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">VARY Portal</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-zinc-200 flex-col shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-zinc-200">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">VARY Portal</h1>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-zinc-100 text-zinc-900' 
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-4 md:p-8 h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)] z-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col items-center justify-center w-full h-full space-y-1',
                isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <Icon className={clsx("w-6 h-6", isActive ? "fill-zinc-100" : "")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
