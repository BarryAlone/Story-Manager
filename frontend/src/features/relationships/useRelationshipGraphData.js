import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { buildRelationshipGraphData } from './relationshipGraphData';

export default function useRelationshipGraphData(projectId, dataRevision, scenarioKey) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadGraph = async () => {
      setStatus('loading');
      setError('');
      setGraphData({ nodes: [], links: [] });

      try {
        let characters;
        let relationships;

        if (import.meta.env.DEV && scenarioKey) {
          const { createRelationshipGraphScenario } = await import('./relationshipGraphScenarios');
          const scenario = createRelationshipGraphScenario(scenarioKey);
          if (!scenario) throw new Error('Nieznany scenariusz grafu.');
          ({ characters, relationships } = scenario);
        } else {
          const [charactersResponse, relationshipsResponse] = await Promise.all([
            apiFetch(`/api/projects/${projectId}/characters`),
            apiFetch(`/api/projects/${projectId}/character-relationships`),
          ]);
          if (!charactersResponse.ok || !relationshipsResponse.ok) {
            throw new Error('Nie udało się pobrać danych grafu.');
          }

          const charactersPayload = await charactersResponse.json();
          const relationshipsPayload = await relationshipsResponse.json();
          characters = Array.isArray(charactersPayload?.characters)
            ? charactersPayload.characters
            : [];
          relationships = Array.isArray(relationshipsPayload)
            ? relationshipsPayload
            : [];
        }

        if (cancelled) return;
        setGraphData(buildRelationshipGraphData(characters, relationships, {
          synthetic: Boolean(scenarioKey),
        }));
        setStatus('ready');
      } catch (loadError) {
        if (cancelled) return;
        console.error('Błąd pobierania danych do grafu:', loadError);
        setGraphData({ nodes: [], links: [] });
        setError(loadError instanceof Error ? loadError.message : 'Nie udało się wczytać grafu.');
        setStatus('error');
      }
    };

    loadGraph();
    return () => {
      cancelled = true;
    };
  }, [dataRevision, projectId, retryToken, scenarioKey]);

  return {
    graphData,
    status,
    error,
    retry: () => setRetryToken((value) => value + 1),
  };
}
