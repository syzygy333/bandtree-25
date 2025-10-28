import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../contentfulClient';

const Musician = () => {
  const [musician, setMusician] = useState(null);
  const [loading, setLoading] = useState(true);
  const { musicianSlug } = useParams(); // Get the musician ID from the URL

  useEffect(() => {
    const fetchMusician = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'musician',
          'fields.slug': musicianSlug,
          include: 1, // Fetch up to 10 levels of linked content
        });
        
        if (response.items.length) {
          setMusician(response.items[0]);
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
      {musician.fields.tracks && (
        <div>
          {musician.fields.linkedFrom}
        </div>
      )}
    </div>
  );
};

export default Musician;