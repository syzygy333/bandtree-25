// Utility to compute band-to-band connections via shared musicians.
// Expects an array of band entries with releases and musicians included.
export function computeBandConnections(bands = []) {
  const musicianToBands = {};

  bands.forEach((band) => {
    const musicianIds = new Set(
      (band.fields.releases || []).flatMap((release) =>
        (release.fields?.musicians || []).map((m) => m.sys.id)
      )
    );

    musicianIds.forEach((musicianId) => {
      if (!musicianToBands[musicianId]) {
        musicianToBands[musicianId] = new Set();
      }
      musicianToBands[musicianId].add(band.sys.id);
    });
  });

  const connectionsByBandId = {};
  let mostConnected = null;

  bands.forEach((band) => {
    const musicianIds = new Set(
      (band.fields.releases || []).flatMap((release) =>
        (release.fields?.musicians || []).map((m) => m.sys.id)
      )
    );

    const connectedBandIds = new Set();
    musicianIds.forEach((musicianId) => {
      const bandsForMusician = musicianToBands[musicianId] || new Set();
      bandsForMusician.forEach((bandId) => {
        if (bandId !== band.sys.id) {
          connectedBandIds.add(bandId);
        }
      });
    });

    connectionsByBandId[band.sys.id] = connectedBandIds;

    const connectionsCount = connectedBandIds.size;
    if (!mostConnected || connectionsCount > mostConnected.connectionsCount) {
      mostConnected = { band, connectionsCount };
    }
  });

  return { connectionsByBandId, topBand: mostConnected };
}

export function mapConnectionIdsToBands(bandId, bands, connectionsByBandId) {
  const idSet = connectionsByBandId[bandId] || new Set();
  const bandById = new Map(bands.map((b) => [b.sys.id, b]));
  return [...idSet]
    .map((id) => bandById.get(id))
    .filter(Boolean);
}

