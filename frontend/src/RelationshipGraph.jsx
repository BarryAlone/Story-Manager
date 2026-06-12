import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';

function RelationshipGraph() {
  const { projectId } = useParams();
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth - 300);

  useEffect(() => {
    // Funkcja pobierająca postacie i relacje między nimi jednocześnie
    const fetchData = async () => {
      try {
        const charsResponse = await fetch(`http://localhost:8000/api/projects/${projectId}/characters`);
        const charsData = await charsResponse.json();
        const characters = Array.isArray(charsData?.characters) ? charsData.characters : [];

        const relsResponse = await fetch(`http://localhost:8000/api/projects/${projectId}/character-relationships`);
        const relsData = await relsResponse.json();

        // 1. Tworzymy węzły (Postacie)
        const nodes = characters.map(char => ({
          id: char.id,
          name: char.name,
          val: 20 // Rozmiar kółka
        }));

        // 2. Tworzymy krawędzie (Relacje)
        const links = relsData.map(rel => ({
          source: rel.character_1_id,
          target: rel.character_2_id,
          label: rel.relation_name || 'Powiązanie'
        }));

        setGraphData({ nodes, links });
      } catch (error) {
        console.error('Błąd pobierania danych do grafu:', error);
      }
    };

    fetchData();

    // Reagowanie na zmianę rozmiaru okna
    const handleResize = () => setWindowWidth(window.innerWidth - 300);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [projectId]);

  return (
    <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      
      <div style={{ padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: 0 }}>Wizualizacja Relacji</h2>
      </div>

      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          width={windowWidth}
          height={600}
          graphData={graphData}
          // Stylizacja krawędzi (linii)
          linkColor={() => '#9ca3af'}
          linkWidth={2}
          // etykiety relacji (label)
          linkLabel={link => link.label}
          
          // imie postaci jako label
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 14 / globalScale; // skalowanie tekstu wraz z zoomem
            
            // Rysowanie kółka (potem zmienić na obrazek postaci)
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = '#2c5692';
            ctx.fill();

            // Rysowanie imienia pod kółkiem
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1f2937';
            ctx.fillText(label, node.x, node.y + 12);
          }}
        />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'gray' }}>
          Ładowanie grafu lub brak danych...
        </div>
      )}
    </div>
  );
}

export default RelationshipGraph;