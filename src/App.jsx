import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectCacheProvider } from './context/ProjectCacheContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import './styles/theme.css';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProjectCacheProvider>
            <AppRoutes />
          </ProjectCacheProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
