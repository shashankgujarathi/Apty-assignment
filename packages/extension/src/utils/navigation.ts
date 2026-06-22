export function getPathDetails(urlPath: string) {
  if (!urlPath) return { pathname: '/', search: '', hash: '' };
  
  const hashIndex = urlPath.indexOf('#');
  const searchIndex = urlPath.indexOf('?');
  
  let pathname = urlPath;
  let search = '';
  let hash = '';

  if (hashIndex !== -1 && searchIndex !== -1) {
    if (searchIndex < hashIndex) {
      pathname = urlPath.substring(0, searchIndex);
      search = urlPath.substring(searchIndex, hashIndex);
      hash = urlPath.substring(hashIndex);
    } else {
      pathname = urlPath.substring(0, hashIndex);
      hash = urlPath.substring(hashIndex, searchIndex);
      search = urlPath.substring(searchIndex);
    }
  } else if (hashIndex !== -1) {
    pathname = urlPath.substring(0, hashIndex);
    hash = urlPath.substring(hashIndex);
  } else if (searchIndex !== -1) {
    pathname = urlPath.substring(0, searchIndex);
    search = urlPath.substring(searchIndex);
  }

  // Normalize pathname: strip trailing slash
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1);
  }
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  return { pathname, search, hash };
}

export function isPathMatch(pathA: string, pathB: string): boolean {
  const a = getPathDetails(pathA);
  const b = getPathDetails(pathB);

  // 1. Pathname must match
  if (a.pathname.toLowerCase() !== b.pathname.toLowerCase()) {
    return false;
  }

  // 2. Hash routing check: if either has a hash route (e.g. starts with #/), they must match.
  const isHashRoute = (h: string) => h.startsWith('#/') || h.startsWith('#!');
  if (isHashRoute(a.hash) || isHashRoute(b.hash)) {
    // Clean trailing slashes or subpaths in hash
    const cleanHash = (h: string) => h.replace(/\/$/, '').toLowerCase();
    if (cleanHash(a.hash) !== cleanHash(b.hash)) {
      return false;
    }
  }

  // 3. Query param routing check:
  // If either path has query params that look like routing, we check them.
  const getRouteParams = (searchStr: string) => {
    const params = new URLSearchParams(searchStr);
    const routeKeys = ['page', 'route', 'tab', 'action', 'view', 'screen', 'p'];
    const result: Record<string, string> = {};
    for (const key of routeKeys) {
      const val = params.get(key);
      if (val) result[key] = val.toLowerCase();
    }
    return result;
  };

  const paramsA = getRouteParams(a.search);
  const paramsB = getRouteParams(b.search);
  for (const key of Object.keys(paramsB)) {
    if (paramsA[key] !== paramsB[key]) {
      return false;
    }
  }

  return true;
}
