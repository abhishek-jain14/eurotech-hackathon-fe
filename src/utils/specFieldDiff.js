// Shared between ChangeTrackerPage and ApplicationSpecsPage - both render the
// same backend EndpointFieldDiffDto (oldFields/newFields, matched only via
// relatedFieldName for renames) as one old/new row per field change.

export const FIELD_CHANGE_LABEL = { RENAMED: 'Renamed', DELETED: 'Deleted', ADDED: 'Added', TYPE_CHANGED: 'Type changed' };

export const FIELD_CHANGE_TAG = { RENAMED: 'tag-p', DELETED: 'tag-r', ADDED: 'tag-g', TYPE_CHANGED: 'tag-a' };

/**
 * TYPE_CHANGED entries appear in both oldFields and newFields for the same
 * field, so only the oldFields side is read here to avoid emitting the row twice.
 */
export const buildFieldRows = (fieldDiff) => {
  if (!fieldDiff) return [];
  const rows = [];
  (fieldDiff.oldFields || []).forEach((f) => {
    if (f.changeType === 'DELETED') rows.push({ kind: 'DELETED', oldValue: f.fieldName, newValue: '' });
    else if (f.changeType === 'RENAMED') rows.push({ kind: 'RENAMED', oldValue: f.fieldName, newValue: f.relatedFieldName });
    else if (f.changeType === 'TYPE_CHANGED') rows.push({ kind: 'TYPE_CHANGED', oldValue: f.fieldName, newValue: f.fieldName });
  });
  (fieldDiff.newFields || []).forEach((f) => {
    if (f.changeType === 'ADDED') rows.push({ kind: 'ADDED', oldValue: '', newValue: f.fieldName });
  });
  return rows;
};