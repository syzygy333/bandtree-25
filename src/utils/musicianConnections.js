function getMusicianIdsFromRelease(release) {
  const linkedMusicians = Array.isArray(release?.fields?.musicians)
    ? release.fields.musicians
    : [];

  return linkedMusicians.map((musician) => musician.sys.id);
}

export function buildCollaboratorSetsByMusicianId(
  releases = [],
  { seedMusicianIds = [], ignoreSingleMusicianReleases = false } = {}
) {
  const collaboratorSetsByMusicianId = {};
  const seededMusicianIdSet = new Set(seedMusicianIds);
  const hasSeededMusicians = seededMusicianIdSet.size > 0;

  seedMusicianIds.forEach((musicianId) => {
    collaboratorSetsByMusicianId[musicianId] = new Set();
  });

  releases.forEach((release) => {
    const linkedMusicianIds = getMusicianIdsFromRelease(release);

    if (ignoreSingleMusicianReleases && linkedMusicianIds.length < 2) {
      return;
    }

    linkedMusicianIds.forEach((musicianId) => {
      if (hasSeededMusicians && !seededMusicianIdSet.has(musicianId)) {
        return;
      }

      if (!collaboratorSetsByMusicianId[musicianId]) {
        collaboratorSetsByMusicianId[musicianId] = new Set();
      }

      linkedMusicianIds.forEach((otherMusicianId) => {
        if (otherMusicianId !== musicianId) {
          collaboratorSetsByMusicianId[musicianId].add(otherMusicianId);
        }
      });
    });
  });

  return collaboratorSetsByMusicianId;
}

export function getConnectionCountsByMusicianId(releases = [], musicianIds = []) {
  const collaboratorSetsByMusicianId = buildCollaboratorSetsByMusicianId(releases, {
    seedMusicianIds: musicianIds,
  });

  const connectionCountsByMusicianId = {};
  musicianIds.forEach((musicianId) => {
    connectionCountsByMusicianId[musicianId] = (collaboratorSetsByMusicianId[musicianId] || new Set()).size;
  });

  return connectionCountsByMusicianId;
}

export function getReleaseCountsByMusicianId(releases = [], musicianIds = []) {
  const seededMusicianIdSet = new Set(musicianIds);
  const releaseCountsByMusicianId = {};

  musicianIds.forEach((musicianId) => {
    releaseCountsByMusicianId[musicianId] = 0;
  });

  releases.forEach((release) => {
    const linkedMusicianIds = getMusicianIdsFromRelease(release);
    const uniqueIdsInRelease = new Set(linkedMusicianIds);

    uniqueIdsInRelease.forEach((musicianId) => {
      if (seededMusicianIdSet.has(musicianId)) {
        releaseCountsByMusicianId[musicianId] += 1;
      }
    });
  });

  return releaseCountsByMusicianId;
}

export function getMusicianConnectionCount(releases = [], musicianId) {
  if (!musicianId) {
    return 0;
  }

  const connectionCountsByMusicianId = getConnectionCountsByMusicianId(releases, [musicianId]);
  return connectionCountsByMusicianId[musicianId] || 0;
}

export function getMostConnectedMusicianFromReleases(releases = []) {
  const collaboratorSetsByMusicianId = buildCollaboratorSetsByMusicianId(releases, {
    ignoreSingleMusicianReleases: true,
  });

  let mostConnectedMusicianId = null;
  let maxConnections = 0;

  Object.keys(collaboratorSetsByMusicianId).forEach((musicianId) => {
    const connectionsCount = collaboratorSetsByMusicianId[musicianId].size;
    if (connectionsCount > maxConnections) {
      maxConnections = connectionsCount;
      mostConnectedMusicianId = musicianId;
    }
  });

  return {
    musicianId: mostConnectedMusicianId,
    connectionsCount: maxConnections,
  };
}
