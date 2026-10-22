function parentIdOf(chapter) {
  return chapter.parent_id === null || chapter.parent_id === undefined
    ? null
    : Number(chapter.parent_id);
}

function sameGroup(chapter, target) {
  return Boolean(chapter.is_in_manuscript) === target.isInManuscript
    && parentIdOf(chapter) === target.parentId;
}

function nextSortOrder(chapters, isInManuscript, parentId) {
  return chapters
    .filter((chapter) => (
      Boolean(chapter.is_in_manuscript) === isInManuscript
      && parentIdOf(chapter) === parentId
    ))
    .reduce((maximum, chapter) => Math.max(maximum, Number(chapter.sort_order || 0)), 0) + 1;
}

export function chapterHasChildren(chapters, chapterId) {
  return chapters.some((chapter) => parentIdOf(chapter) === Number(chapterId));
}

export function isValidChapterDrop(chapter, target, chapters) {
  if (!chapter || !target) return false;

  if (target.kind === 'reorder') {
    return sameGroup(chapter, target)
      && (target.beforeId === null || Number(target.beforeId) !== Number(chapter.id));
  }

  if (target.kind === 'manuscript') {
    return !chapter.is_in_manuscript || parentIdOf(chapter) !== null;
  }

  if (target.kind === 'drafts') {
    return Boolean(chapter.is_in_manuscript);
  }

  if (target.kind === 'parent') {
    return Number(chapter.id) !== Number(target.parentId)
      && parentIdOf(chapter) !== Number(target.parentId)
      && !chapterHasChildren(chapters, chapter.id);
  }

  return false;
}

export function payloadForDrop(chapter, target) {
  if (target.kind === 'reorder') {
    return {
      action: 'reorder',
      chapter_id: chapter.id,
      before_id: target.beforeId,
    };
  }

  if (target.kind === 'drafts') {
    return { action: 'to_drafts', chapter_id: chapter.id };
  }

  return null;
}

export function optimisticChapterMove(chapters, payload) {
  const next = chapters.map((chapter) => ({ ...chapter }));
  const source = next.find((chapter) => Number(chapter.id) === Number(payload.chapter_id));
  if (!source) return next;

  if (payload.action === 'reorder') {
    const group = next
      .filter((chapter) => (
        Boolean(chapter.is_in_manuscript) === Boolean(source.is_in_manuscript)
        && parentIdOf(chapter) === parentIdOf(source)
      ))
      .sort((left, right) => (
        source.is_in_manuscript
          ? Number(left.chapter_number) - Number(right.chapter_number)
          : Number(left.sort_order) - Number(right.sort_order)
      ));
    const numbers = group.map((chapter) => Number(chapter.chapter_number)).sort((a, b) => a - b);
    const sourceIndex = group.findIndex((chapter) => Number(chapter.id) === Number(source.id));
    const beforeIndex = payload.before_id === null || payload.before_id === undefined
      ? group.length
      : group.findIndex((chapter) => Number(chapter.id) === Number(payload.before_id));

    if (sourceIndex < 0 || beforeIndex < 0) return next;
    const destinationIndex = beforeIndex === group.length
      ? group.length - 1
      : beforeIndex - (sourceIndex < beforeIndex ? 1 : 0);
    const reordered = arrayMove(group, sourceIndex, destinationIndex);

    reordered.forEach((chapter, index) => {
      chapter.sort_order = index + 1;
      if (source.is_in_manuscript) chapter.chapter_number = numbers[index];
    });

    return next;
  }

  if (payload.action === 'to_drafts') {
    const wasRoot = parentIdOf(source) === null;
    source.is_in_manuscript = false;
    source.sort_order = nextSortOrder(next, false, null);

    if (wasRoot) {
      next.forEach((chapter) => {
        if (parentIdOf(chapter) === Number(source.id)) chapter.is_in_manuscript = false;
      });
    } else {
      source.parent_id = null;
    }

    return next;
  }

  if (payload.action === 'to_manuscript') {
    source.parent_id = null;
    source.is_in_manuscript = true;
    source.chapter_number = payload.chapter_number;
    source.sort_order = nextSortOrder(next, true, null);
    next.forEach((chapter) => {
      if (parentIdOf(chapter) === Number(source.id)) chapter.is_in_manuscript = true;
    });

    return next;
  }

  if (payload.action === 'to_subchapter') {
    source.parent_id = payload.parent_id;
    source.is_in_manuscript = true;
    source.chapter_number = payload.chapter_number;
    source.sort_order = nextSortOrder(next, true, Number(payload.parent_id));
  }

  return next;
}
import { arrayMove } from '@dnd-kit/helpers';

