import client from '../contentfulClient';
import { computeBandConnections } from './bandConnections';
import { getMostConnectedMusicianFromReleases } from './musicianConnections';

export async function fetchMostConnectedMusician() {
  const releasesResponse = await client.getEntries({
    content_type: 'release',
    select: 'fields.musicians',
    limit: 1000,
  });

  const { musicianId, connectionsCount } = getMostConnectedMusicianFromReleases(
    releasesResponse.items
  );

  if (!musicianId) {
    return null;
  }

  const musicianDetails = await client.getEntry(musicianId);
  return {
    ...musicianDetails,
    uniqueCollaboratorCount: connectionsCount,
  };
}

export async function fetchMostConnectedBand() {
  const response = await client.getEntries({
    content_type: 'band',
    include: 3,
    limit: 1000,
  });

  return getMostConnectedBandFromEntries(response.items);
}

export function getMostConnectedBandFromEntries(bands = []) {
  const { topBand } = computeBandConnections(bands);
  return topBand;
}
