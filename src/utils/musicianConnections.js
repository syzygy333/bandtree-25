/**
 * Builds a graph of musician connections based on shared releases.
 * Returns an adjacency list: { musicianId: Set([connectedMusicianId1, connectedMusicianId2, ...]) }
 */
export function buildMusicianGraph(releases) {
  const graph = {};
  
  releases.forEach(release => {
    const musicians = release.fields.musicians || [];
    const musicianIds = musicians.map(m => m.sys.id);
    
    // Create edges between all musicians on the same release
    musicianIds.forEach(musicianId => {
      if (!graph[musicianId]) {
        graph[musicianId] = new Set();
      }
      
      musicianIds.forEach(otherMusicianId => {
        if (musicianId !== otherMusicianId) {
          graph[musicianId].add(otherMusicianId);
        }
      });
    });
  });
  
  return graph;
}

/**
 * Finds the shortest path between two musicians using BFS.
 * Returns an array of musician IDs representing the path, or null if no path exists.
 * Optimized with proper queue implementation and path reconstruction.
 */
export function findPathBetweenMusicians(graph, startMusicianId, endMusicianId) {
  // If they're the same musician
  if (startMusicianId === endMusicianId) {
    return [startMusicianId];
  }
  
  // If either musician doesn't exist in the graph
  if (!graph[startMusicianId] || !graph[endMusicianId]) {
    return null;
  }
  
  // BFS to find shortest path
  // Use proper queue with head pointer instead of array.shift() which is O(n)
  const queue = [startMusicianId];
  const visited = new Set([startMusicianId]);
  const parent = new Map(); // Track parent for path reconstruction
  
  let head = 0;
  
  while (head < queue.length) {
    const currentId = queue[head++];
    
    // Check if we've reached the destination
    if (currentId === endMusicianId) {
      // Reconstruct path
      const path = [];
      let node = endMusicianId;
      while (node !== undefined) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }
    
    // Explore neighbors
    const neighbors = graph[currentId] || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parent.set(neighborId, currentId);
        queue.push(neighborId);
      }
    }
  }
  
  // No path found
  return null;
}

/**
 * Builds an index of releases by musician pairs for fast lookup.
 * Returns a Map where key is "id1|id2" (sorted) and value is array of releases.
 */
export function buildReleaseIndex(releases) {
  const index = new Map();
  
  releases.forEach(release => {
    const musicianIds = (release.fields.musicians || []).map(m => m.sys.id);
    
    // Create pairs for all musicians on this release
    for (let i = 0; i < musicianIds.length; i++) {
      for (let j = i + 1; j < musicianIds.length; j++) {
        const id1 = musicianIds[i];
        const id2 = musicianIds[j];
        // Create consistent key (always smaller ID first)
        const key = id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`;
        
        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key).push(release);
      }
    }
  });
  
  return index;
}

/**
 * Gets the release(s) that connect two musicians using pre-built index.
 * Returns an array of release objects.
 */
export function getConnectingReleases(releaseIndex, musicianId1, musicianId2) {
  const key = musicianId1 < musicianId2 
    ? `${musicianId1}|${musicianId2}` 
    : `${musicianId2}|${musicianId1}`;
  return releaseIndex.get(key) || [];
}

