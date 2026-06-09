import { Outlet, Link } from 'react-router-dom';

function GlobalLayout() {
  return (
    // Główny kontener na cały ekran
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
      
      {/* HEADER */}
      <header style={{ 
        height: '65px', 
        flexShrink: 0, // dzięki temu header nie będzie się kurczył
        borderBottom: '1px solid #e5e7eb', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0 24px' 
      }}>
        
        {/* LOGO Z TOOLTIPEM */}
        <Link to="/" title="Strona główna" style={{ textDecoration: 'none', color: 'black', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* MIEJSCE NA LOGO (na razie emotikonka) */}
          <span style={{ fontSize: '28px' }}>📖</span> 
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Story Manager</span>
        </Link>

        {/* TYMCZASOWA IKONA UŻYTKOWNIKA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: '500' }}>Kacper</span>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
            K
          </div>
        </div>
      </header>

      {/* ZAWARTOŚĆ MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
        <Outlet /> 
      </main>
    </div>
  );
}

export default GlobalLayout;