import type { Game, League, Season, TournamentEvent, Venue } from '@/types/holdem';

export type AppViewMode =
  | 'games'
  | 'leaderboard'
  | 'stats'
  | 'director'
  | 'tv'
  | 'admin'
  | 'info'
  | 'gallery';

export interface AppRoute {
  view: AppViewMode;
  seasonId?: string;
  gameId?: string;
  playerId?: string;
}

const PREFIX_SCOPED_VIEWS = new Set<string>([
  'admin',
  'leaderboard',
  'standings',
  'info',
  'gallery',
]);

const RESERVED_VIEWS = new Set<string>([
  'games',
  'director',
  'leaderboard',
  'standings',
  'stats',
  'tv',
  'admin',
  'info',
  'gallery',
]);

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizeViewName(segment: string): AppViewMode {
  if (segment === 'standings') return 'leaderboard';
  return segment as AppViewMode;
}

/**
 * Returns the deployment base path without trailing slash (e.g. '' for root '/' or '/holdem'
 * when hosted on GitHub Pages at /holdem/).
 */
export function getAppBasePath(): string {
  const raw =
    typeof import.meta !== 'undefined' &&
      import.meta.env &&
      typeof import.meta.env.BASE_URL === 'string'
      ? import.meta.env.BASE_URL
      : '/';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '.') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function stripBasePath(pathname: string): string {
  const base = getAppBasePath();
  if (!base) return pathname;
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) {
    return pathname.slice(base.length);
  }
  return pathname;
}

function withBasePath(appPath: string): string {
  const base = getAppBasePath();
  if (!base) return appPath;
  if (appPath === '/') return `${base}/`;
  return `${base}${appPath.startsWith('/') ? appPath : `/${appPath}`}`;
}

/**
 * Parses clean prefix-first hierarchical URLs (league is stored in session/localStorage):
 *   /                                      -> Home / active league games
 *   /games                                 -> Active league games
 *   /games/:seasonId                       -> Season games page
 *   /games/:seasonId/:gameId               -> Live game page (Director Desk)
 *   /games/:seasonId/:gameId/tv            -> Venue TV display for that game
 *   /leaderboard[/:seasonId]               -> Standings (alias: /standings)
 *   /admin[/:seasonId]                     -> Admin console
 *   /info[/:seasonId]                      -> Rules & venues
 *   /gallery[/:seasonId]                   -> Gallery
 *   /stats[/:playerId]                     -> Player stats
 *
 * Also gracefully accepts legacy #hash links and old /:leagueId/... paths.
 */
export function parseAppRoute(pathname: string, hash: string = ''): AppRoute {
  const relativePathname = stripBasePath(pathname);
  const segments = relativePathname
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(safeDecode);

  // Backwards compatibility for old #hash links (e.g. #games/id, #leaderboard, #admin)
  if (segments.length === 0 && hash) {
    const cleanedHash = hash.replace(/^#\/?/, '').trim();
    if (cleanedHash) {
      const hashSegments = cleanedHash
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(safeDecode);
      const [h0, h1] = hashSegments;
      if (h0 === 'games' || h0 === 'director') {
        return h1 ? { view: 'director', gameId: h1 } : { view: 'games' };
      }
      if (h0 === 'tv') return { view: 'tv', gameId: h1 };
      if (h0 === 'stats') return { view: 'stats', playerId: h1 };
      if (h0 && PREFIX_SCOPED_VIEWS.has(h0)) {
        return { view: normalizeViewName(h0), seasonId: h1 };
      }
    }
  }

  if (segments.length === 0) {
    return { view: 'games' };
  }

  const [seg0, seg1, seg2, seg3, seg4] = segments;

  // Games hierarchy: /games[/:seasonId[/:gameId[/tv]]]
  if (seg0 === 'games') {
    if (!seg1) return { view: 'games' };
    if (!seg2) return { view: 'games', seasonId: seg1 };
    // Legacy 3-ID form: /games/:leagueId/:seasonId/:gameId[/tv]
    if (seg3 && seg3 !== 'tv') {
      if (seg4 === 'tv') {
        return { view: 'tv', seasonId: seg2, gameId: seg3 };
      }
      return { view: 'director', seasonId: seg2, gameId: seg3 };
    }
    if (seg3 === 'tv') {
      return { view: 'tv', seasonId: seg1, gameId: seg2 };
    }
    return { view: 'director', seasonId: seg1, gameId: seg2 };
  }

  // Prefix-scoped sections: /admin[/:seasonId], /leaderboard[/:seasonId], /info, /gallery
  if (PREFIX_SCOPED_VIEWS.has(seg0)) {
    // Also accept legacy /:view/:leagueId/:seasonId by taking the season segment
    return {
      view: normalizeViewName(seg0),
      seasonId: seg2 || seg1 || undefined,
    };
  }

  if (seg0 === 'stats') {
    return { view: 'stats', playerId: seg1 };
  }

  if (seg0 === 'tv') {
    return { view: 'tv', gameId: seg1 };
  }

  if (seg0 === 'director') {
    return seg1 ? { view: 'director', gameId: seg1 } : { view: 'games' };
  }

  // Bare shortcut fallback: /:seasonId[/:gameId[/tv]]
  if (!RESERVED_VIEWS.has(seg0)) {
    if (!seg1) return { view: 'games', seasonId: seg0 };
    if (seg2 === 'tv') return { view: 'tv', seasonId: seg0, gameId: seg1 };
    if (!RESERVED_VIEWS.has(seg1)) {
      return { view: 'director', seasonId: seg0, gameId: seg1 };
    }
  }

  return { view: 'games' };
}

/**
 * Builds the canonical shareable URL pathname for any AppRoute.
 */
export function buildAppPath(route: AppRoute): string {
  if (route.view === 'games') {
    return withBasePath(route.seasonId ? `/games/${encodeURIComponent(route.seasonId)}` : '/');
  }

  if (route.view === 'director') {
    if (route.seasonId && route.gameId) {
      return withBasePath(
        `/games/${encodeURIComponent(route.seasonId)}/${encodeURIComponent(route.gameId)}`
      );
    }
    if (route.gameId) {
      return withBasePath(`/games/${encodeURIComponent(route.gameId)}`);
    }
    return withBasePath(route.seasonId ? `/games/${encodeURIComponent(route.seasonId)}` : '/');
  }

  if (route.view === 'tv') {
    if (route.seasonId && route.gameId) {
      return withBasePath(
        `/games/${encodeURIComponent(route.seasonId)}/${encodeURIComponent(route.gameId)}/tv`
      );
    }
    if (route.gameId) {
      return withBasePath(`/tv/${encodeURIComponent(route.gameId)}`);
    }
    return withBasePath('/tv');
  }

  if (route.view === 'stats') {
    return withBasePath(route.playerId ? `/stats/${encodeURIComponent(route.playerId)}` : '/stats');
  }

  // admin, leaderboard, info, gallery: /<view>[/:seasonId]
  return withBasePath(
    route.seasonId ? `/${route.view}/${encodeURIComponent(route.seasonId)}` : `/${route.view}`
  );
}

export function resolveSeasonLeagueId(
  season: Season | undefined,
  leagues: League[]
): string | undefined {
  if (season?.leagueId && leagues.some((l) => l.$id === season.leagueId)) {
    return season.leagueId;
  }
  return leagues[0]?.$id;
}

export function resolveGameRouteIds(
  game: Game,
  seasons: Season[],
  venues: Venue[],
  leagues: League[]
): { leagueId?: string; seasonId?: string; gameId: string } {
  const validLeagueIds = new Set(leagues.map((l) => l.$id));
  const matchedSeason = seasons.find((s) => s.$id === game.seasonId);
  const matchedVenue = venues.find((v) => v.$id === game.venueId);

  const candidateLeagueId = matchedSeason?.leagueId || matchedVenue?.leagueId;
  const leagueId =
    candidateLeagueId && validLeagueIds.has(candidateLeagueId)
      ? candidateLeagueId
      : leagues[0]?.$id;

  const leagueSeasons = leagueId
    ? seasons.filter((s) => !s.leagueId || s.leagueId === leagueId)
    : seasons;
  const fallbackSeason = leagueSeasons.find((s) => s.isActive) || leagueSeasons[0] || seasons[0];
  const seasonId = matchedSeason?.$id || fallbackSeason?.$id;

  return {
    leagueId,
    seasonId,
    gameId: game.$id,
  };
}

/**
 * Reconciles foreign-key IDs (leagueId, seasonId, venueId) across loaded collections so that
 * Appwrite-generated $ids, unexpanded relationship fields, and legacy rows without explicit
 * seasonId/venueId columns always resolve consistently across page refreshes and bookmarks.
 */
export function reconcileEntityRelationships(data: {
  leagues: League[];
  seasons: Season[];
  venues: Venue[];
  events: TournamentEvent[];
  games: Game[];
}): {
  leagues: League[];
  seasons: Season[];
  venues: Venue[];
  events: TournamentEvent[];
  games: Game[];
} {
  const { leagues } = data;
  const validLeagueIds = new Set(leagues.map((l) => l.$id));
  const defaultLeagueId = leagues[0]?.$id || '';

  const seasons = data.seasons.map((s) => ({
    ...s,
    leagueId: s.leagueId && validLeagueIds.has(s.leagueId) ? s.leagueId : defaultLeagueId,
  }));

  const venues = data.venues.map((v) => ({
    ...v,
    leagueId: v.leagueId && validLeagueIds.has(v.leagueId) ? v.leagueId : defaultLeagueId,
  }));

  const validSeasonIds = new Set(seasons.map((s) => s.$id));
  const validVenueIds = new Set(venues.map((v) => v.$id));
  const defaultSeason = seasons.find((s) => s.isActive) || seasons[0];
  const defaultSeasonId = defaultSeason?.$id || '';
  const venueByName = new Map(venues.map((v) => [v.name.trim().toLowerCase(), v]));

  const events = data.events.map((ev) => {
    const resolvedSeasonId =
      ev.seasonId && validSeasonIds.has(ev.seasonId) ? ev.seasonId : defaultSeasonId;
    const matchedVenueByName = ev.venueName
      ? venueByName.get(ev.venueName.trim().toLowerCase())
      : undefined;
    const resolvedVenueId =
      ev.venueId && validVenueIds.has(ev.venueId)
        ? ev.venueId
        : matchedVenueByName?.$id || venues[0]?.$id || ev.venueId;
    return {
      ...ev,
      seasonId: resolvedSeasonId,
      venueId: resolvedVenueId,
    };
  });

  const eventById = new Map(events.map((e) => [e.$id, e]));

  const games = data.games.map((g) => {
    const parentEvent = g.eventId ? eventById.get(g.eventId) : undefined;
    const resolvedSeasonId =
      g.seasonId && validSeasonIds.has(g.seasonId)
        ? g.seasonId
        : parentEvent?.seasonId && validSeasonIds.has(parentEvent.seasonId)
          ? parentEvent.seasonId
          : defaultSeasonId;

    const matchedVenueByName = g.venueName
      ? venueByName.get(g.venueName.trim().toLowerCase())
      : undefined;
    const resolvedVenueId =
      g.venueId && validVenueIds.has(g.venueId)
        ? g.venueId
        : parentEvent?.venueId && validVenueIds.has(parentEvent.venueId)
          ? parentEvent.venueId
          : matchedVenueByName?.$id || (!g.venueId && !g.venueName ? venues[0]?.$id || '' : g.venueId);

    const matchedVenue = venues.find((v) => v.$id === resolvedVenueId);

    return {
      ...g,
      seasonId: resolvedSeasonId,
      venueId: resolvedVenueId,
      venueName: matchedVenue?.name || g.venueName || parentEvent?.venueName || 'TBD Venue',
    };
  });

  return { leagues, seasons, venues, events, games };
}
