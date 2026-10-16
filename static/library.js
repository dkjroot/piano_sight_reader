// Catalogue browsing stays local and separate from the active exercise.
export const LIBRARY_FIELDS=['composer','era','style','difficulty'];
export function libraryValue(piece,field) {
  return typeof piece?.[field]==='string' && piece[field].trim() ? piece[field].trim() : 'Unrated';
}
export function libraryFacets(pieces,field) {
  return [...new Set(pieces.map(piece=>libraryValue(piece,field)))].sort((a,b)=>a.localeCompare(b,'en'));
}
function searchable(value) {
  return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en')
    .replace(/[#♯]/g,'sharp').replace(/♭/g,'flat').replace(/[^\p{L}\p{N}]/gu,'');
}
export function filterLibrary(pieces,filters={}) {
  const tokens=(typeof filters.query==='string' ? filters.query.slice(0,120) : '').split(/\s+/).map(searchable).filter(Boolean);
  return pieces.filter(piece=>LIBRARY_FIELDS.every(field=>!filters[field] || libraryValue(piece,field)===filters[field]) &&
    (!tokens.length || tokens.every(token=>searchable([piece.title,piece.composer,piece.source_title,piece.id,...LIBRARY_FIELDS.map(field=>libraryValue(piece,field))].join(' ')).includes(token))))
    .slice().sort((a,b)=>`${a.composer} ${a.title}`.localeCompare(`${b.composer} ${b.title}`,'en'));
}

export function randomLibraryPiece(pieces,filters={},currentId='',random=Math.random) {
  const matches=filterLibrary(pieces,filters);
  const pool=matches.length>1 ? matches.filter(piece=>piece.id!==currentId) : matches;
  if(!pool.length) return null;
  const value=Number(random()), index=Number.isFinite(value) ? Math.max(0,Math.min(pool.length-1,Math.floor(value*pool.length))) : 0;
  return pool[index];
}
