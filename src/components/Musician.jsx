import React, { useEffect, useState } from 'react';
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
          
          // Fetch all releases that reference this musician
          const releasesResponse = await client.getEntries({
            content_type: 'release', // Change to Release content type ID
            'fields.musicians.sys.id': foundMusician.sys.id,
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

  if (loading) {
    return <div>Loading musician...</div>;
  }

  if (!musician) {
    return <div>Musician not found.</div>;
  }

  return (
    <div>
      <h1>{musician.fields.name}</h1>
      
      {releases.length > 0 && (
        <div>
          <h2>Releases</h2>
          <ul>
            {releases.map((release) => (
              <li key={release.sys.id}>
                <Link to={`/releases/${release.fields.slug}`}>
                  {release.fields.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Musician;