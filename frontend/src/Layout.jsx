import { Link } from 'react-router-dom';

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 1. LEWY PASEK BOCZNY (SIDEBAR) */}
      <nav style={{ width: '220px', borderRight: '2px solid #ccc', padding: '20px' }}>
        <h3>📖 Story Manager</h3>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li>
            {/* Zamiast <a href="..."> używamy <Link to="..."> z React Routera */}
            <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>
              🏠 Projekty
            </Link>
          </li>
          {/* W przyszłości dodamy tu linki do konkretnych projektów */}
        </ul>
      </nav>

      {/* PRAWA STRONA (HEADER + OBSZAR ROBOCZY) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* 2. GÓRNY PASEK (HEADER) */}
        <header style={{ height: '60px', borderBottom: '2px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <div>
            {/* Miejsce na nawigację wstecz / nazwę obecnego widoku */}
            <span>Dashboard</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Kacper</span>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'gray', color: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              K
            </div>
          </div>
        </header>

        {/* 3. GŁÓWNY OBSZAR ROBOCZY */}
        <main style={{ padding: '20px' }}>
          {/* TUTAJ REACT WSTRZYKNIE NASZ PROJECTLIST (lub inną stronę) */}
          {children}
        </main>

      </div>
    </div>
  );
}

export default Layout;