import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectCacheProvider } from './context/ProjectCacheContext';
import { ThemeProvider } from './context/ThemeContext';
import { DialogProvider } from './context/DialogContext';
import AppRoutes from './routes/AppRoutes';
import './styles/theme.css';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <DialogProvider>
          <AuthProvider>
            <ProjectCacheProvider>
              <AppRoutes />
            </ProjectCacheProvider>
          </AuthProvider>
        </DialogProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
