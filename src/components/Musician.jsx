import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const Musician = () => {
  const [musician, setMusician] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { musicianSlug } = useParams(); // Get the musician ID from the URL

  useEffect(() => {
    const fetchMusician = async () => {
      try {
        // Fetch the musician entry first
        const musicianResponse = await client.getEntries({
          content_type: 'musician',
          'fields.slug': musicianSlug,
          include: 1,
        });
        
        if (musicianResponse.items.length) {
          const foundMusician = musicianResponse.items[0];
          setMusician(foundMusician);
          
          // Fetch all releases that reference this musician, including linked musicians
          const releasesResponse = await client.getEntries({
            content_type: 'release',
            'fields.musicians.sys.id': foundMusician.sys.id,
            order: '-fields.year',
            include: 2, // Include linked musicians on releases
          });
          setReleases(releasesResponse.items);
        } else {
          setMusician(null); // Set to null if not found
        }
        
      } catch (error) {
        console.error("Error fetching musician:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMusician();
  }, [musicianSlug]); // Re-run effect if the musicianSlug in the URL changes

  // Calculate the count of unique connected musicians (first-degree relationships)
  const connectedMusiciansCount = useMemo(() => {
    if (!musician || !releases.length) return 0;
    
    const currentMusicianId = musician.sys.id;
    const connectedMusicianIds = new Set();
    
    // Iterate through all releases and collect unique musician IDs
    releases.forEach((release) => {
      if (release.fields.musicians && Array.isArray(release.fields.musicians)) {
        release.fields.musicians.forEach((connectedMusician) => {
          // Only add if it's not the current musician
          if (connectedMusician.sys.id !== currentMusicianId) {
            connectedMusicianIds.add(connectedMusician.sys.id);
          }
        });
      }
    });
    
    return connectedMusicianIds.size;
  }, [musician, releases]);

  if (loading) {
    return <div>Loading musician...</div>;
  }

  if (!musician) {
    return <div>Musician not found.</div>;
  }

  return (
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">{musician.fields.name}</h1>
      </div>
      <div className="content">
        
        {releases.length > 0 && (
          <article className="musician-content">
            <p>
              Connected to <strong>{connectedMusiciansCount}</strong> musician{connectedMusiciansCount !== 1 ? 's' : ''} across <strong>{releases.length}</strong> shared release{releases.length !== 1 ? 's' : ''}.
            </p>
            <h2>Releases</h2>
            <ul>
              {releases.map((release) => (
                <li key={release.sys.id}>
                  <Link to={`/releases/${release.fields.slug}`}>
                    {release.fields.title} ({release.fields.year})
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </>
  );
};

export default Musician;