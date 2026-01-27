import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import { buildMusicianGraph, findPathBetweenMusicians, buildReleaseIndex, getConnectingReleases } from '../utils/musicianConnections';

const SixDegrees = () => {
  const [musicians, setMusicians] = useState([]);
  const [releases, setReleases] = useState([]);
  const [startMusician, setStartMusician] = useState(null);
  const [endMusician, setEndMusician] = useState(null);
  const [path, setPath] = useState(null);
  const [pathDetails, setPathDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [startSearchTerm, setStartSearchTerm] = useState('');
  const [endSearchTerm, setEndSearchTerm] = useState('');
  const [startSearchResults, setStartSearchResults] = useState([]);
  const [endSearchResults, setEndSearchResults] = useState([]);
  const [graph, setGraph] = useState(null);
  const [releaseIndex, setReleaseIndex] = useState(null);
  
  // Create musician lookup map for O(1) access
  const musicianMap = useMemo(() => {
    const map = new Map();
    musicians.forEach(musician => {
      map.set(musician.sys.id, musician);
    });
    return map;
  }, [musicians]);

  // Fetch all musicians and releases on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [musiciansResponse, releasesResponse] = await Promise.all([
          client.getEntries({
            content_type: 'musician',
            order: 'fields.name',
            limit: 1000,
          }),
          client.getEntries({
            content_type: 'release',
            include: 2, // Include linked musicians
            limit: 1000,
          }),
        ]);

        setMusicians(musiciansResponse.items);
        setReleases(releasesResponse.items);
        
        // Build the graph and release index
        const musicianGraph = buildMusicianGraph(releasesResponse.items);
        const index = buildReleaseIndex(releasesResponse.items);
        setGraph(musicianGraph);
        setReleaseIndex(index);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refs for debouncing
  const startSearchTimeoutRef = useRef(null);
  const endSearchTimeoutRef = useRef(null);

  // Search for start musician with debouncing
  const handleStartSearch = useCallback((query) => {
    if (startSearchTimeoutRef.current) {
      clearTimeout(startSearchTimeoutRef.current);
    }

    if (!query.trim()) {
      setStartSearchResults([]);
      return;
    }

    startSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await client.getEntries({
          content_type: 'musician',
          'fields.name[match]': query,
          order: 'fields.name',
          limit: 10,
        });
        setStartSearchResults(response.items);
      } catch (error) {
        console.error('Error searching musicians:', error);
      }
    }, 300);
  }, []);

  // Search for end musician with debouncing
  const handleEndSearch = useCallback((query) => {
    if (endSearchTimeoutRef.current) {
      clearTimeout(endSearchTimeoutRef.current);
    }

    if (!query.trim()) {
      setEndSearchResults([]);
      return;
    }

    endSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await client.getEntries({
          content_type: 'musician',
          'fields.name[match]': query,
          order: 'fields.name',
          limit: 10,
        });
        setEndSearchResults(response.items);
      } catch (error) {
        console.error('Error searching musicians:', error);
      }
    }, 300);
  }, []);

  // Auto-find path when both musicians are selected
  useEffect(() => {
    if (!startMusician || !endMusician || !graph || !releaseIndex || !musicianMap.size) {
      return;
    }

    setSearching(true);
    
    // Use setTimeout to allow UI to update before heavy computation
    const timeoutId = setTimeout(() => {
      try {
        const musicianPath = findPathBetweenMusicians(
          graph,
          startMusician.sys.id,
          endMusician.sys.id
        );

        if (musicianPath) {
          setPath(musicianPath);
          
          // Build path details with connecting releases using optimized lookups
          const details = [];
          for (let i = 0; i < musicianPath.length - 1; i++) {
            const musicianId1 = musicianPath[i];
            const musicianId2 = musicianPath[i + 1];
            
            // Use Map for O(1) lookup instead of array.find()
            const musician1 = musicianMap.get(musicianId1);
            const musician2 = musicianMap.get(musicianId2);
            
            // Use pre-built index for O(1) lookup instead of filtering all releases
            const connectingReleases = getConnectingReleases(releaseIndex, musicianId1, musicianId2);
            
            if (musician1 && musician2) {
              details.push({
                from: musician1,
                to: musician2,
                releases: connectingReleases,
              });
            }
          }
          
          setPathDetails(details);
        } else {
          setPath(null);
          setPathDetails([]);
        }
      } catch (error) {
        console.error('Error finding path:', error);
        setPath(null);
        setPathDetails([]);
      } finally {
        setSearching(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [startMusician, endMusician, graph, releaseIndex, musicianMap]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const degrees = path ? path.length - 1 : null;

  return (
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">Six Degrees of Separation</h1>
      </div>
      <div className="content">
        <article className="six-degrees-content">
          <p>
            Find if there is a connection path between any two musicians in the database.
            Musicians are connected if they appear on the same release together.
          </p>

          <div className="six-degrees-selectors">
            <div className="musician-selector">
              <h2>From</h2>
              {startMusician ? (
                <div className="selected-musician">
                  <Link to={`/musicians/${startMusician.fields.slug}`}>
                    {startMusician.fields.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setStartMusician(null);
                      setPath(null);
                      setPathDetails([]);
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search for a musician..."
                    value={startSearchTerm}
                    onChange={(e) => {
                      setStartSearchTerm(e.target.value);
                      handleStartSearch(e.target.value);
                    }}
                  />
                  {startSearchResults.length > 0 && (
                    <ul className="search-results">
                      {startSearchResults.map((musician) => (
                        <li key={musician.sys.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setStartMusician(musician);
                              setStartSearchTerm('');
                              setStartSearchResults([]);
                            }}
                          >
                            {musician.fields.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="musician-selector">
              <h2>To</h2>
              {endMusician ? (
                <div className="selected-musician">
                  <Link to={`/musicians/${endMusician.fields.slug}`}>
                    {endMusician.fields.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEndMusician(null);
                      setPath(null);
                      setPathDetails([]);
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search for a musician..."
                    value={endSearchTerm}
                    onChange={(e) => {
                      setEndSearchTerm(e.target.value);
                      handleEndSearch(e.target.value);
                    }}
                  />
                  {endSearchResults.length > 0 && (
                    <ul className="search-results">
                      {endSearchResults.map((musician) => (
                        <li key={musician.sys.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setEndMusician(musician);
                              setEndSearchTerm('');
                              setEndSearchResults([]);
                            }}
                          >
                            {musician.fields.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {searching && (
            <div className="searching-message">Finding connection...</div>
          )}

          {path && path.length > 0 && (
            <div className="path-result">
              <h2>
                {degrees === 0
                  ? 'Same musician!'
                  : degrees === 1
                  ? 'Direct connection!'
                  : `${degrees} degree${degrees !== 1 ? 's' : ''} of separation`}
              </h2>
              
              <div className="path-visualization">
                {pathDetails.map((detail, index) => (
                  <div key={index} className="path-step">
                    <div className="path-musician">
                      <Link to={`/musicians/${detail.from.fields.slug}`}>
                        {detail.from.fields.name}
                      </Link>
                    </div>
                    <div className="path-connector">
                      <span className="connector-arrow">→</span>
                      {detail.releases.length > 0 && (
                        <div className="connecting-releases">
                          {detail.releases.slice(0, 3).map((release) => (
                            <Link
                              key={release.sys.id}
                              to={`/releases/${release.fields.slug}`}
                              className="release-link"
                            >
                              {release.fields.title}
                              {release.fields.year && ` (${release.fields.year})`}
                            </Link>
                          ))}
                          {detail.releases.length > 3 && (
                            <span className="more-releases">
                              +{detail.releases.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="path-musician">
                      <Link to={`/musicians/${detail.to.fields.slug}`}>
                        {detail.to.fields.name}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {startMusician && endMusician && !searching && path === null && (
            <div className="no-path-message">
              No connection found between these musicians.
            </div>
          )}
        </article>
      </div>
    </>
  );
};

export default SixDegrees;

