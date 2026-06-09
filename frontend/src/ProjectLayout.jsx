import { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useParams } from 'react-router-dom';

function ProjectLayout() {
  const { projectId } = useParams();
  const [projectName, setProjectName] = useState('Ładowanie...');

  useEffect(() => {
    fetch('http://localhost:8000/api/projects')
      .then(res => res.json())
      .then(data => {
        const currentProject = data.find(p => p.id === parseInt(projectId));
        if (currentProject) setProjectName(currentProject.name);
      })
      .catch(() => setProjectName(`Projekt ID: ${projectId}`));
  }, [projectId]);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
      
      {/* efekty hover w sidebarze */}
      <style>{`
        .sidebar-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 50px;
          height: 50px;
          border-radius: 12px;
          margin-bottom: 15px;
          text-decoration: none;
          color: black;
          transition: background-color 0.2s ease;
        }
        .sidebar-icon:hover {
          background-color: #f3f4f6; /* Jasnoszary hover a'la Pinterest */
        }
      `}</style>

      {/* SIDEBAR */}
      <nav style={{ 
        width: '80px',
        flexShrink: 0,
        borderRight: '1px solid #e5e7eb', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0' 
      }}>
        
        {/* ICONA LOGA PROJEKTU / POWRÓT DO STRONY GŁÓWNEJ */}
        <Link to="/" title="Strona główna" style={{ textDecoration: 'none', marginBottom: '40px' }}>
          <span style={{ fontSize: '28px' }}>📖</span>
        </Link>

        {/* LINKI Z IKONAMI (Zastosowanie NavLink dla stanu active) */}
        <NavLink to={`/project/${projectId}/characters`} title="Postacie" className="sidebar-icon">
          {({ isActive }) => (

            <span style={{ fontSize: '24px', opacity: isActive ? 1 : 0.4 }}>👤</span>
          )}
        </NavLink>

        <NavLink to={`/project/${projectId}/chapters`} title="Rozdziały" className="sidebar-icon">
          {({ isActive }) => (
            <span style={{ fontSize: '24px', opacity: isActive ? 1 : 0.4 }}>📚</span>
          )}
        </NavLink>

        <NavLink to={`/project/${projectId}/relationships`} title="Relacje" className="sidebar-icon">
        {({ isActive }) => (
            <span style={{ fontSize: '24px', opacity: isActive ? 1 : 0.4 }}>🔗</span>
        )}
        </NavLink>
        
      </nav>

      {/* 2. PRAWA STRONA (Header + Kontent) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <header style={{ 
          height: '65px', 
          flexShrink: 0,
          borderBottom: '1px solid #e5e7eb', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 24px' 
        }}>
          {/* Nazwa obecnego projektu */}
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>
            {projectName}
          </h2>

          {/* IKONA UŻYTKOWNIKA po prawej */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
              K
            </div>
          </div>
        </header>

        {/* GŁÓWNY OBSZAR ROBOCZY */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}

export default ProjectLayout;