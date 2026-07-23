// fieldsJson is persisted as a raw JSON string shaped { headers, pathParams, requestBody } -
// never trust it parses cleanly (bulk-uploaded or hand-edited rows can be malformed).
export const parseFieldsJson = (fieldsJson) => {
  if (!fieldsJson) return {};
  try {
    const parsed = JSON.parse(fieldsJson);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const isNonEmptyObject = (v) => v && typeof v === 'object' && Object.keys(v).length > 0;

// requestBody is the primary "what does this record actually contain" view; path params
// then headers are the fallback so a record with only header/path data still shows something.
export const effectiveFieldEntries = (parsed) => {
  if (isNonEmptyObject(parsed?.requestBody)) return Object.entries(parsed.requestBody);
  if (isNonEmptyObject(parsed?.pathParams)) return Object.entries(parsed.pathParams);
  if (isNonEmptyObject(parsed?.headers)) return Object.entries(parsed.headers);
  const isGroupedShape = parsed && typeof parsed === 'object' && ('headers' in parsed || 'pathParams' in parsed || 'requestBody' in parsed);
  if (!isGroupedShape && parsed && typeof parsed === 'object') return Object.entries(parsed);
  return [];
};

// Which group backs effectiveFieldEntries - needed when saving edits back into the
// { headers, pathParams, requestBody } shape without touching the other groups.
export const effectiveGroupKey = (parsed) => {
  if (isNonEmptyObject(parsed?.requestBody)) return 'requestBody';
  if (isNonEmptyObject(parsed?.pathParams)) return 'pathParams';
  if (isNonEmptyObject(parsed?.headers)) return 'headers';
  return null;
};

export const previewPairs = (parsed, limit = 2) => effectiveFieldEntries(parsed).slice(0, limit);

export const fieldCount = (parsed) => {
  const groups = [parsed?.headers, parsed?.pathParams, parsed?.requestBody];
  return groups.reduce((sum, g) => sum + (g && typeof g === 'object' ? Object.keys(g).length : 0), 0);
};

export const headerKeys = (parsed) => (isNonEmptyObject(parsed?.headers) ? Object.keys(parsed.headers) : []);
