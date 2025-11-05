import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const Releases = () => {
  const [releases, setReleases] = useState([]);
  const [totalReleases, setTotalReleases] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'release',
        });
        if (response.items.length) {
          setReleases(response.items);
        }
        // Use response.total to get the actual total count, regardless of pagination
        setTotalReleases(response.total);
      } catch (error) {
        console.error("Error fetching releases:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReleases();
  }, []); // The empty dependency array ensures this effect runs only once

  if (loading) {
    return <div>Loading releases...</div>;
  }

  if (releases.length === 0) {
    return <div>No releases found.</div>;
  }

  return (
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">Releases</h1>
      </div>
      <div className="subhero-info">
        {totalReleases} release{totalReleases !== 1 ? 's' : ''} in the tree
      </div>
      <div className="content">
        {releases &&
          <ul>
            {releases.map((release) => (
              <li key={release.fields.slug}>
                <Link to={`/releases/${release.fields.slug}`}>
                  {release.fields.title}
                </Link>
              </li>
            ))}
          </ul>
        }
      </div>
    </>
  );
};

export default Releases;