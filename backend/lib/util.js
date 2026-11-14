// Parses a positive integer id from a route param; returns null if invalid.
function parseId(value) {
  return /^\d{1,18}$/.test(String(value)) && Number(value) > 0 ? String(value) : null;
}

// Parses ?limit= (default 20, clamped 1..50) and ?before= / ?after= id cursors.
function parsePaging(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  return { limit, before: parseId(query.before), after: parseId(query.after) };
}

module.exports = { parseId, parsePaging };
