import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import ServerSideSearch from './Search';
import { computeBandConnections } from '../utils/bandConnections';

const Bands = () => {
  const [bands, setBands] = useState([]);
  const [totalBands, setTotalBands] = useState(0);
  const [topBand, setTopBand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBands = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'band', // Filter for entries of content type 'band'
          include: 3, // pull linked releases and musicians for connectivity calc
          limit: 1000, // ensure we consider all bands (raise if needed)
        });
        if (response.items.length) {
          setBands(response.items);
        }
        // Use response.total to get the actual total count, regardless of pagination
        setTotalBands(response.total);

        const { topBand: mostConnected } = computeBandConnections(response.items);
        setTopBand(mostConnected);
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
      <div className="content bands">
        <ServerSideSearch
          contentTypeId="band"
          searchFieldId="name"
        />
        {topBand && (
          <>
            <h2>The most connected band</h2>
            <p>
              <Link to={`/bands/${topBand.band.fields.slug}`}>
                {topBand.band.fields.name}
              </Link> connects to {topBand.connectionsCount} other band{topBand.connectionsCount !== 1 ? 's' : ''} via shared musicians.
            </p>
          </>
        )}
        <h2>100 most recent updates</h2>
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