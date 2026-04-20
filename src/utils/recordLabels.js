export function getRecordLabelName(recordLabelField) {
  if (typeof recordLabelField === 'string') {
    return recordLabelField.trim();
  }

  if (recordLabelField?.fields?.name) {
    return String(recordLabelField.fields.name).trim();
  }

  if (recordLabelField?.fields?.title) {
    return String(recordLabelField.fields.title).trim();
  }

  return '';
}

export function slugifyRecordLabelName(labelName = '') {
  return String(labelName)
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
