import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';

import Layout from './Layout';

import ProjectList from './ProjectList';
import CharacterList from './CharacterList';
// --- KOMPONENTY (WIDOKI) ---

function App(){
const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <Router>
      <Layout>

        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/project/:projectId" element={<CharacterList />} />
          {/* W przyszłości dodamy tu więcej tras, np. do widoku konkretnego projektu */}
        </Routes>

      </Layout>
    </Router>
  );
}

export default App;