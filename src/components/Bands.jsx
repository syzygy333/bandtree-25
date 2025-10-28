import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const Bands = () => {
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBands = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'band', // Filter for entries of content type 'band'
        });
        if (response.items.length) {
          setBands(response.items);
        }
      } catch (error) {
        console.error("Error fetching bands:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBands();
  }, []); // The empty dependency array ensures this effect runs only once

  if (loading) {
    return <div>Loading bands...</div>;
  }

  if (bands.length === 0) {
    return <div>No bands found.</div>;
  }

  return (
    <div>
      <h1>Bands</h1>
      {bands.map((band) => (
        <ul>
          <li key={band.fields.slug}>
            <Link to={`/bands/${band.fields.slug}`}>
              {band.fields.name}
            </Link>
          </li>
        </ul>
      ))}
    </div>
  );
};

export default Bands;