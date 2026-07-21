import { createContext, useContext, useState, useCallback } from 'react';
import { listProjects } from '../api/projectApi';

const ProjectCacheContext = createContext(null);

export function ProjectCacheProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const ensureLoaded = useCallback(async () => {
    if (projects.length) return;
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data || []);
    } finally {
      setLoading(false);
    }
  }, [projects.length]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ProjectCacheContext.Provider value={{ projects, ensureLoaded, refresh, loading }}>
      {children}
    </ProjectCacheContext.Provider>
  );
}

export function useProjectCache() {
  const ctx = useContext(ProjectCacheContext);
  if (!ctx) throw new Error('useProjectCache must be used within ProjectCacheProvider');
  return ctx;
}

export default ProjectCacheContext;
