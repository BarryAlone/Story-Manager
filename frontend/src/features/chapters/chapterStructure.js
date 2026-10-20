function compareByOrder(left, right) {
  const orderDifference = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
  return orderDifference || Number(left.id) - Number(right.id);
}

function compareByChapterNumber(left, right) {
  const leftNumber = Number(left.chapter_number);
  const rightNumber = Number(right.chapter_number);
  const leftHasNumber = Number.isFinite(leftNumber) && leftNumber > 0;
  const rightHasNumber = Number.isFinite(rightNumber) && rightNumber > 0;

  if (leftHasNumber && rightHasNumber && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  if (leftHasNumber !== rightHasNumber) {
    return leftHasNumber ? -1 : 1;
  }

  return compareByOrder(left, right);
}

function displayNumber(chapter) {
  const number = Number(chapter.chapter_number);
  return Number.isFinite(number) && number > 0 ? String(number) : '';
}

function belongsToManuscript(chapter) {
  if (typeof chapter.is_in_manuscript === 'boolean') {
    return chapter.is_in_manuscript;
  }

  return Number(chapter.chapter_number) > 0;
}

export function buildChapterStructure(chapters) {
  const manuscript = chapters.filter(belongsToManuscript);
  const drafts = chapters.filter((chapter) => !belongsToManuscript(chapter));
  const manuscriptIds = new Set(manuscript.map((chapter) => Number(chapter.id)));
  const draftIds = new Set(drafts.map((chapter) => Number(chapter.id)));
  const manuscriptChildrenByParent = new Map();
  const draftChildrenByParent = new Map();

  manuscript.forEach((chapter) => {
    const parentId = chapter.parent_id === null || chapter.parent_id === undefined
      ? null
      : Number(chapter.parent_id);
    if (parentId === null || !manuscriptIds.has(parentId)) return;

    const children = manuscriptChildrenByParent.get(parentId) || [];
    children.push(chapter);
    manuscriptChildrenByParent.set(parentId, children);
  });

  drafts.forEach((chapter) => {
    const parentId = chapter.parent_id === null || chapter.parent_id === undefined
      ? null
      : Number(chapter.parent_id);
    if (parentId === null || !draftIds.has(parentId)) return;

    const children = draftChildrenByParent.get(parentId) || [];
    children.push(chapter);
    draftChildrenByParent.set(parentId, children);
  });

  const roots = manuscript
    .filter((chapter) => (
      chapter.parent_id === null
      || chapter.parent_id === undefined
      || !manuscriptIds.has(Number(chapter.parent_id))
    ))
    .sort(compareByChapterNumber)
    .map((chapter) => ({
      chapter,
      number: displayNumber(chapter),
      children: (manuscriptChildrenByParent.get(Number(chapter.id)) || [])
        .sort(compareByChapterNumber)
        .map((child) => {
          const parentNumber = displayNumber(chapter);
          const childNumber = displayNumber(child);

          return {
            chapter: child,
            number: parentNumber && childNumber ? `${parentNumber}.${childNumber}` : '',
          };
        }),
    }));

  const draftRoots = drafts
    .filter((chapter) => (
      chapter.parent_id === null
      || chapter.parent_id === undefined
      || !draftIds.has(Number(chapter.parent_id))
    ))
    .sort(compareByOrder)
    .map((chapter) => ({
      chapter,
      number: '',
      children: (draftChildrenByParent.get(Number(chapter.id)) || [])
        .sort(compareByOrder)
        .map((child) => ({ chapter: child, number: '' })),
    }));

  const numberById = new Map();
  roots.forEach((root) => {
    numberById.set(Number(root.chapter.id), root.number);
    root.children.forEach((child) => numberById.set(Number(child.chapter.id), child.number));
  });

  return { roots, drafts: draftRoots, numberById };
}
