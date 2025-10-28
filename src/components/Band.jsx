import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const Band = () => {
  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);
  const { bandSlug } = useParams(); // Get the band ID from the URL

  useEffect(() => {
    const fetchBand = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'band',
          'fields.slug': bandSlug,
          include: 1, // Fetch up to 10 levels of linked content
        });
        
        if (response.items.length) {
          setBand(response.items[0]);
        } else {
          setBand(null); // Set to null if not found
        }
      } catch (error) {
        console.error("Error fetching band:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBand();
  }, [bandSlug]); // Re-run effect if the bandSlug in the URL changes

  if (loading) {
    return <div>Loading band...</div>;
  }

  if (!band) {
    return <div>Band not found.</div>;
  }

  return (
    <div>
      <h1>{band.fields.name}</h1>
      {/* Access and render the linked releases */}
      {band.fields.releases && (
        <div>
          <h2>Releases</h2>
          <ul>
            {band.fields.releases.map((release) => (
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

export default Band;
