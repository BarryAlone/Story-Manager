import { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useParams } from 'react-router-dom';

import logoIcon from './assets/icons/logo.png';
import charactersIcon from "./assets/icons/woman.png"; 
import chaptersIcon from './assets/icons/chapter.png';
import relationshipsIcon from './assets/icons/relationship.png';
import attributesIcon from './assets/icons/attribute.png';
import UserMenu from './UserMenu';
import { apiFetch } from './api';

function ProjectLayout() {
  const { projectId } = useParams();
  const [projectName, setProjectName] = useState('Ładowanie...');

  useEffect(() => {
    apiFetch('/api/projects')
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
            <img src={logoIcon} alt="Logo" style={{ width: '70px', height: '70px' }} />
        </Link>

        {/* LINKI Z IKONAMI (Zastosowanie NavLink dla stanu active) */}
        <NavLink to={`/project/${projectId}/characters`} title="Postacie" className="sidebar-icon">
          {({ isActive }) => (
            <img
             src={charactersIcon}
            alt="Postacie"
            style={{ fontSize: '48px', opacity: isActive ? 1 : 0.4, width: '32px', height: '32px' }}
            />
          )}
        </NavLink>

        <NavLink to={`/project/${projectId}/chapters`} title="Rozdziały" className="sidebar-icon">
          {({ isActive }) => (
            <img
             src={chaptersIcon}
            alt="Rozdziały"
            style={{ fontSize: '48px', opacity: isActive ? 1 : 0.4, width: '32px', height: '32px' }}
            />
          )}
        </NavLink>

        <NavLink to={`/project/${projectId}/relationships`} title="Relacje" className="sidebar-icon">
        {({ isActive }) => (
            <img
             src={relationshipsIcon}
            alt="Relacje"
            style={{ fontSize: '48px', opacity: isActive ? 1 : 0.4, width: '32px', height: '32px' }}
            />
        )}
        </NavLink>

        <NavLink to={`/project/${projectId}/attributes`} title="Atrybuty" className="sidebar-icon">
        {({ isActive }) => (
            <img
             src={attributesIcon}
            alt="Atrybuty"
            style={{ fontSize: '48px', opacity: isActive ? 1 : 0.4, width: '32px', height: '32px' }}
            />
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

          <UserMenu />
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
