import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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

function App() {
  return (
    <Router>
      <Routes>
        
        {/* --- GLOBAL --- */}
        <Route element={<GlobalLayout />}>
          <Route path="/" element={<ProjectList />} />
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

      </Routes>
    </Router>
  );
}

export default App;