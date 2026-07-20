import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectCacheProvider } from './context/ProjectCacheContext';
import AppRoutes from './routes/AppRoutes';
import './styles/theme.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectCacheProvider>
          <AppRoutes />
        </ProjectCacheProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
