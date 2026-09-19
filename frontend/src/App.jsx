import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

// Importujemy nasze ramki i strony
import GlobalLayout from './GlobalLayout';
import ProjectLayout from './ProjectLayout';
import ProjectList from './ProjectList';
import CharacterList from './CharacterList';
import CharacterDetail from './CharacterDetail';
import ChapterList from './ChapterList';
import RelationshipList from './RelationshipList';
import ChapterDetail from './ChapterDetail';
import AttributeList from './AttributeList'; // Upewnij się, że masz ten import!
import AuthProvider from './AuthProvider';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Profile from './Profile';
import useAuth from './useAuth';

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Sprawdzanie sesji...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route element={<ProtectedRoutes />}>
            {/* --- GLOBAL --- */}
            <Route element={<GlobalLayout />}>
              <Route path="/" element={<ProjectList />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* --- PROJECT (Parent) --- */}
            <Route path="/project/:projectId" element={<ProjectLayout />}>
              {/* Childs */}
              <Route path="characters" element={<CharacterList />} />
              <Route path="characters/:characterId" element={<CharacterDetail />} />
              <Route path="chapters" element={<ChapterList />} />
              <Route path="chapters/:chapterId" element={<ChapterDetail />} />
              <Route path="attributes" element={<AttributeList />} />
              <Route path="relationships" element={<RelationshipList />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
