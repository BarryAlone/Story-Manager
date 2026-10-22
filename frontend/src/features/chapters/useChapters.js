import { useCallback, useEffect, useState } from 'react';
import { apiFetch, readJson } from '../../api';

function responseMessage(data, fallback) {
  const validationMessage = Object.values(data?.errors || {}).flat()[0];
  return validationMessage || data?.message || fallback;
}

async function requestChapters(projectId) {
  const response = await apiFetch(`/api/chapters/${projectId}/chapters`);
  const data = await readJson(response);

  if (!response.ok || !Array.isArray(data)) {
    throw new Error(responseMessage(data, 'Nie udało się pobrać rozdziałów.'));
  }

  return data;
}

function mergeChapterStructure(chapters, structureSource) {
  const structureById = new Map(
    structureSource.map((chapter) => [Number(chapter.id), chapter]),
  );

  return chapters.map((chapter) => {
    const structure = structureById.get(Number(chapter.id));
    if (!structure) return chapter;

    return {
      ...chapter,
      chapter_number: structure.chapter_number,
      is_in_manuscript: structure.is_in_manuscript,
      parent_id: structure.parent_id,
      sort_order: structure.sort_order,
    };
  });
}

export default function useChapters(projectId) {
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStructure, setIsUpdatingStructure] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadChapters = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setIsLoading(true);
    setLoadError('');

    try {
      const data = await requestChapters(projectId);
      setChapters(data);
    } catch (error) {
      setLoadError(error.message || 'Nie udało się pobrać rozdziałów.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialChapters = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await requestChapters(projectId);
        if (!cancelled) setChapters(data);
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Nie udało się pobrać rozdziałów.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadInitialChapters();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const saveChapter = async ({ chapter, fields, image, removeImage = false }) => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('name', fields.name);
    formData.append('description', fields.description || '');

    if (chapter) {
      const isDraft = fields.placement === 'draft';
      const isSubchapter = fields.placement === 'subchapter';
      formData.append(
        'chapter_number',
        isDraft ? (chapter.chapter_number ?? '') : fields.chapterNumber,
      );
      formData.append('is_in_manuscript', isDraft ? '0' : '1');
      formData.append(
        'parent_id',
        isDraft ? (fields.parentId || '') : (isSubchapter ? fields.parentId : ''),
      );
    } else if (fields.chapterNumber) {
      formData.append('chapter_number', fields.chapterNumber);
    }
    if (fields.timelinePointStart) formData.append('timeline_point_start', fields.timelinePointStart);
    if (fields.timelinePointEnd) formData.append('timeline_point_end', fields.timelinePointEnd);
    if (fields.displayLabel) formData.append('display_label', fields.displayLabel);
    if (image) formData.append('chapter_image', image);
    else if (removeImage) formData.append('chapter_image', '');

    const path = chapter ? `/api/chapters/${chapter.id}` : '/api/chapters';
    if (chapter) formData.append('_method', 'PUT');

    const response = await apiFetch(path, { method: 'POST', body: formData });
    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(responseMessage(data, 'Nie udało się zapisać rozdziału.'));
    }

    setChapters((current) => (
      chapter
        ? current.map((item) => (item.id === chapter.id ? data : item))
        : [...current, data]
    ));

    return data;
  };

  const deleteChapter = async (chapterId) => {
    const response = await apiFetch(`/api/chapters/${chapterId}`, { method: 'DELETE' });
    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(responseMessage(data, 'Nie udało się usunąć rozdziału.'));
    }

    setChapters((current) => current.filter((chapter) => chapter.id !== chapterId));
  };

  const createSubchapter = async ({ parent, fields }) => {
    const response = await apiFetch('/api/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: Number(projectId),
        parent_id: parent.id,
        is_in_manuscript: true,
        chapter_number: Number(fields.chapterNumber),
        name: fields.name,
        description: fields.description || '',
      }),
    });
    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(responseMessage(data, 'Nie udało się utworzyć podrozdziału.'));
    }

    setChapters((current) => [...current, data]);
    return data;
  };

  const swapChapters = async (chapterId, payload) => {
    const response = await apiFetch(`/api/chapters/${chapterId}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(responseMessage(data, 'Nie udało się zmienić kolejności rozdziałów.'));
    }

    await loadChapters({ showLoading: false });
  };

  const updateChapterStructure = async (payload, optimisticChapters) => {
    const previousChapters = chapters;
    setIsUpdatingStructure(true);
    setChapters(optimisticChapters);

    try {
      const response = await apiFetch(`/api/projects/${projectId}/chapter-structure`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson(response);

      if (!response.ok || !Array.isArray(data?.chapters)) {
        throw new Error(responseMessage(data, 'Nie udało się zmienić struktury rozdziałów.'));
      }

      setChapters((current) => mergeChapterStructure(current, data.chapters));
      return data.chapters;
    } catch (error) {
      setChapters((current) => mergeChapterStructure(current, previousChapters));
      throw error;
    } finally {
      setIsUpdatingStructure(false);
    }
  };

  const updateChapterContent = useCallback(async (chapter, content) => {
    const payload = {
      project_id: Number(projectId),
      chapter_number: chapter.chapter_number,
      name: chapter.name,
      description: content.description,
      description_long: content.description_long,
      notes: content.notes,
      parent_id: chapter.parent_id,
      sort_order: chapter.sort_order,
      is_in_manuscript: chapter.is_in_manuscript,
      timeline_point_start: chapter.timeline_point_start,
      timeline_point_end: chapter.timeline_point_end,
      display_label: chapter.display_label,
    };
    const response = await apiFetch(`/api/chapters/${chapter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);

    if (!response.ok) {
      const validationMessage = Object.values(data?.errors || {}).flat()[0];
      throw new Error(validationMessage || responseMessage(data, 'Nie udało się zapisać treści rozdziału.'));
    }

    setChapters((current) => current.map((item) => (
      Number(item.id) === Number(chapter.id) ? data : item
    )));

    return data;
  }, [projectId]);

  return {
    chapters,
    createSubchapter,
    deleteChapter,
    isLoading,
    isUpdatingStructure,
    loadChapters,
    loadError,
    saveChapter,
    swapChapters,
    updateChapterStructure,
    updateChapterContent,
  };
}
