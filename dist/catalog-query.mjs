export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterCatalog(catalog, {query = '', genre = '', kind = 'all', savedIds = null, kids = false} = {}) {
  const term = normalizeSearch(query);
  const category = normalizeSearch(genre);
  const saved = Array.isArray(savedIds) ? new Set(savedIds) : null;
  return catalog.filter(movie => {
    if (kids && !(typeof movie.age === 'number' && movie.age <= 10)) return false;
    if (saved && !saved.has(movie.id)) return false;
    if (kind !== 'all' && movie.kind !== kind) return false;
    const genres = Array.isArray(movie.genres) ? movie.genres : [];
    if (category && !genres.some(item => normalizeSearch(item) === category)) return false;
    return !term || normalizeSearch([movie.title, ...genres, movie.synopsis, movie.director].join(' ')).includes(term);
  });
}
