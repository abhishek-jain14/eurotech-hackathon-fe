import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { listProjects } from '../api/projectApi';

const ProjectCacheContext = createContext(null);

export function ProjectCacheProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadPromiseRef = useRef(null);

  const ensureLoaded = useCallback(async () => {
    if (loaded) return;
    if (loadPromiseRef.current) return loadPromiseRef.current;
    
    setLoading(true);
    loadPromiseRef.current = (async () => {
      try {
        const data = await listProjects();
        // API returns paginated response: { content: [], pageNumber, pageSize, totalElements, totalPages, last }
        const projectsArray = Array.isArray(data?.content) ? data.content : [];
        setProjects(projectsArray);
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setProjects([]);
        setLoaded(true);
      } finally {
        setLoading(false);
        loadPromiseRef.current = null;
      }
    })();
    
    return loadPromiseRef.current;
  }, [loaded]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects();
      // API returns paginated response: { content: [], pageNumber, pageSize, totalElements, totalPages, last }
      const projectsArray = Array.isArray(data?.content) ? data.content : [];
      setProjects(projectsArray);
    } catch (err) {
      console.error('Failed to refresh projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ProjectCacheContext.Provider value={{ projects: Array.isArray(projects) ? projects : [], ensureLoaded, refresh, loading }}>
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
