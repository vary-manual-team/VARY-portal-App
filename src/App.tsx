import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import Lab from './pages/Lab';
import Archive from './pages/Archive';
import ProjectDetail from './pages/ProjectDetail';
import Layout from './components/Layout';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/lab" replace />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
