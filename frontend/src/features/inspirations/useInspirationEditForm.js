import { useMemo, useRef, useState } from 'react';

function initialValues(inspiration) {
  return {
    content: inspiration.content || '',
    image: null,
    source: inspiration.source || '',
    title: inspiration.title || '',
  };
}

export default function useInspirationEditForm({ inspiration, onUpdate }) {
  const [values, setValues] = useState(() => initialValues(inspiration));
  const [removeImage, setRemoveImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const canSave = Boolean(
    values.title.trim()
    || values.content.trim()
    || values.image
    || (inspiration.image_path && !removeImage)
  );
  const isDirty = useMemo(() => (
    values.title !== (inspiration.title || '')
    || values.content !== (inspiration.content || '')
    || values.source !== (inspiration.source || '')
    || Boolean(values.image)
    || removeImage
  ), [inspiration.content, inspiration.source, inspiration.title, removeImage, values]);

  const reset = (nextInspiration = inspiration) => {
    setValues(initialValues(nextInspiration));
    setRemoveImage(false);
    setError('');
  };

  const changeField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const changeImage = (image) => {
    setValues((current) => ({ ...current, image }));
    if (image) setRemoveImage(false);
  };

  const removeCurrentImage = () => {
    setRemoveImage(true);
  };

  const save = async () => {
    if (savingRef.current) return { status: 'blocked' };
    if (!isDirty) return { status: 'unchanged' };
    if (!canSave) {
      setError('Uzupełnij tytuł, treść albo dodaj zdjęcie.');
      return { status: 'invalid' };
    }

    savingRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      const updated = await onUpdate(inspiration.id, { ...values, removeImage });
      reset(updated);
      return { status: 'saved', inspiration: updated };
    } catch (saveError) {
      setError(saveError.message || 'Nie udało się zapisać zmian.');
      return { status: 'error' };
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return {
    canSave,
    changeField,
    changeImage,
    error,
    isDirty,
    isSaving,
    removeCurrentImage,
    removeImage,
    reset,
    save,
    savingRef,
    setError,
    values,
  };
}
