const ACTIVE_RANGE = { min: 80, max: 100 };
const OUT_OF_SERVICE_RANGE = { min: 20, max: 30 };

function stableNumberFromResource(resource) {
  const key = `${resource?.id ?? ''}-${resource?.name ?? ''}-${resource?.type ?? ''}`;
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function scoreInRange(resource, min, max) {
  const span = max - min + 1;
  return min + (stableNumberFromResource(resource) % span);
}

export function getResourceHealthScore(resource) {
  if (resource?.status === 'OUT_OF_SERVICE') {
    return scoreInRange(resource, OUT_OF_SERVICE_RANGE.min, OUT_OF_SERVICE_RANGE.max);
  }

  return scoreInRange(resource, ACTIVE_RANGE.min, ACTIVE_RANGE.max);
}
