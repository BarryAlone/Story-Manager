import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importujemy nasze ramki i strony
import GlobalLayout from './GlobalLayout';
import ProjectLayout from './ProjectLayout';
import ProjectList from './ProjectList';
import CharacterList from './CharacterList';
import ChapterList from './ChapterList';
import RelationshipList from './RelationshipList';

function App() {
  return (
    <Router>
      <Routes>
        
        {/* --- STREFA GLOBALNA (Z GlobalLayout) --- */}
        <Route element={<GlobalLayout />}>
          <Route path="/" element={<ProjectList />} />
        </Route>

        {/* --- STREFA PROJEKTU (Z ProjectLayout) --- */}
        <Route path="/project/:projectId" element={<ProjectLayout />}>
          <Route path="characters" element={<CharacterList />} />
          <Route path="chapters" element={<ChapterList />} />
          <Route path="relationships" element={<RelationshipList />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;