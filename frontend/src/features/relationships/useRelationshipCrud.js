import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api';

export default function useRelationshipCrud(projectId, isTestMode, firstCharacterRef) {
  const [relationships, setRelationships] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [listStatus, setListStatus] = useState('loading');
  const [listError, setListError] = useState('');
  const [graphRevision, setGraphRevision] = useState(0);
  const [editingRelationshipId, setEditingRelationshipId] = useState(null);
  const [character1Id, setCharacter1Id] = useState('');
  const [character2Id, setCharacter2Id] = useState('');
  const [character1Query, setCharacter1Query] = useState('');
  const [character2Query, setCharacter2Query] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setListStatus('loading');
    setListError('');
    try {
      const [charactersResponse, relationshipsResponse] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/characters`),
        apiFetch(`/api/projects/${projectId}/character-relationships`),
      ]);
      if (!charactersResponse.ok || !relationshipsResponse.ok) {
        throw new Error('Nie udało się pobrać danych relacji.');
      }
      const charactersPayload = await charactersResponse.json();
      const relationshipsPayload = await relationshipsResponse.json();
      setCharacters(Array.isArray(charactersPayload?.characters) ? charactersPayload.characters : []);
      setRelationships(Array.isArray(relationshipsPayload) ? relationshipsPayload : []);
      setListStatus('ready');
    } catch (error) {
      console.error('Błąd pobierania relacji:', error);
      setListError(error instanceof Error ? error.message : 'Nie udało się pobrać relacji.');
      setListStatus('error');
    }
  }, [projectId]);

  useEffect(() => {
    const pendingLoad = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(pendingLoad);
  }, [loadData]);

  const getCharacterName = useCallback((id) => (
    characters.find((character) => String(character.id) === String(id))?.name
      || `Nieznana postać (ID: ${id})`
  ), [characters]);

  const resetForm = useCallback(() => {
    setEditingRelationshipId(null);
    setCharacter1Id('');
    setCharacter2Id('');
    setCharacter1Query('');
    setCharacter2Query('');
    setRelationshipType('');
    setFieldErrors({});
    setFormError('');
  }, []);

  const beginNew = useCallback(() => {
    resetForm();
    window.requestAnimationFrame(() => firstCharacterRef.current?.focus());
  }, [firstCharacterRef, resetForm]);

  const beginEdit = useCallback((relationship) => {
    if (!relationship || relationship.synthetic) return;
    setEditingRelationshipId(relationship.id);
    setCharacter1Id(String(relationship.character_1_id));
    setCharacter2Id(String(relationship.character_2_id));
    setCharacter1Query(getCharacterName(relationship.character_1_id));
    setCharacter2Query(getCharacterName(relationship.character_2_id));
    setRelationshipType(relationship.relation_name || '');
    setFieldErrors({});
    setFormError('');
    window.requestAnimationFrame(() => firstCharacterRef.current?.focus());
  }, [firstCharacterRef, getCharacterName]);

  const selectFromGraph = useCallback((graphRelationship) => {
    if (!graphRelationship || graphRelationship.synthetic) return;
    const relationship = relationships.find((candidate) => (
      String(candidate.id) === String(graphRelationship.id)
    ));
    if (relationship) beginEdit(relationship);
  }, [beginEdit, relationships]);

  const refreshAfterMutation = useCallback(async () => {
    await loadData();
    setGraphRevision((value) => value + 1);
  }, [loadData]);

  const save = async (event) => {
    event.preventDefault();
    if (isTestMode || editingRelationshipId !== null) return;

    const localErrors = {};
    if (!character1Id) localErrors.character_1_id = ['Wybierz postać źródłową.'];
    if (!character2Id) localErrors.character_2_id = ['Wybierz postać docelową.'];
    if (character1Id && character1Id === character2Id) {
      localErrors.character_2_id = ['Wybierz dwie różne postacie.'];
    }
    if (!relationshipType.trim()) localErrors.relation_name = ['Podaj typ relacji.'];
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormError('');
    try {
      const response = await apiFetch('/api/character-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_1_id: Number(character1Id),
          character_2_id: Number(character2Id),
          relation_name: relationshipType.trim(),
        }),
      });
      if (response.status === 422) {
        const payload = await response.json();
        setFieldErrors(payload.errors || {});
        return;
      }
      if (!response.ok) throw new Error('Nie udało się zapisać relacji.');
      beginNew();
      await refreshAfterMutation();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Nie udało się zapisać relacji.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = useCallback(async (id) => {
    if (isTestMode || !window.confirm('Usunąć tę relację?')) return false;
    setIsDeleting(true);
    setFormError('');
    try {
      const response = await apiFetch(`/api/character-relationships/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Nie udało się usunąć relacji.');
      if (String(editingRelationshipId) === String(id)) beginNew();
      await refreshAfterMutation();
      return true;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Nie udało się usunąć relacji.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [beginNew, editingRelationshipId, isTestMode, refreshAfterMutation]);

  return {
    characters,
    relationships,
    listStatus,
    listError,
    graphRevision,
    editingRelationshipId,
    character1Id,
    setCharacter1Id,
    character2Id,
    setCharacter2Id,
    character1Query,
    setCharacter1Query,
    character2Query,
    setCharacter2Query,
    relationshipType,
    setRelationshipType,
    fieldErrors,
    formError,
    isSaving,
    isDeleting,
    getCharacterName,
    loadData,
    resetForm,
    beginNew,
    beginEdit,
    selectFromGraph,
    save,
    remove,
  };
}
