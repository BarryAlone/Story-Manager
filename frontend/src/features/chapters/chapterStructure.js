function compareByOrder(left, right) {
  const orderDifference = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
  return orderDifference || Number(left.id) - Number(right.id);
}

function belongsToManuscript(chapter) {
  if (typeof chapter.is_in_manuscript === 'boolean') {
    return chapter.is_in_manuscript;
  }

  return Number(chapter.chapter_number) > 0;
}

export function buildChapterStructure(chapters) {
  const manuscript = chapters.filter(belongsToManuscript);
  const manuscriptIds = new Set(manuscript.map((chapter) => Number(chapter.id)));
  const childrenByParent = new Map();

  manuscript.forEach((chapter) => {
    const parentId = chapter.parent_id === null ? null : Number(chapter.parent_id);
    if (parentId === null || !manuscriptIds.has(parentId)) return;

    const children = childrenByParent.get(parentId) || [];
    children.push(chapter);
    childrenByParent.set(parentId, children);
  });

  const roots = manuscript
    .filter((chapter) => chapter.parent_id === null || !manuscriptIds.has(Number(chapter.parent_id)))
    .sort(compareByOrder)
    .map((chapter, rootIndex) => ({
      chapter,
      number: String(rootIndex + 1),
      children: (childrenByParent.get(Number(chapter.id)) || [])
        .sort(compareByOrder)
        .map((child, childIndex) => ({
          chapter: child,
          number: `${rootIndex + 1}.${childIndex + 1}`,
        })),
    }));

  const drafts = chapters
    .filter((chapter) => !belongsToManuscript(chapter))
    .sort(compareByOrder);

  const numberById = new Map();
  roots.forEach((root) => {
    numberById.set(Number(root.chapter.id), root.number);
    root.children.forEach((child) => numberById.set(Number(child.chapter.id), child.number));
  });

  return { roots, drafts, numberById };
}
