import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import ServerSideSearch from './Search';

const Bands = () => {
  const [bands, setBands] = useState([]);
  const [totalBands, setTotalBands] = useState(0);
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
        // Use response.total to get the actual total count, regardless of pagination
        setTotalBands(response.total);
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
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">Bands</h1>
      </div>
      <div className="subhero-info">
        {totalBands} band{totalBands !== 1 ? 's' : ''} in the tree
      </div>
      <div className="content">
        <ServerSideSearch
          contentTypeId="band"
          searchFieldId="name"
        />
        <h2>100 most recent additions</h2>
        {bands &&
          <ul>
            {bands.map((band) => (
              <li key={band.fields.slug}>
                <Link to={`/bands/${band.fields.slug}`}>
                  {band.fields.name}
                </Link>
              </li>
            ))}
          </ul>
        }
      </div>
    </>
  );
};

export default Bands;