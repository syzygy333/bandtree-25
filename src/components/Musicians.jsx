import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import ServerSideSearch from './Search';

const Musicians = () => {
  const [musicians, setMusicians] = useState([]);
  const [totalMusicians, setTotalMusicians] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMusicians = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'musician',
        });
        if (response.items.length) {
          setMusicians(response.items);
        }
        // Use response.total to get the actual total count, regardless of pagination
        setTotalMusicians(response.total);
      } catch (error) {
        console.error("Error fetching musicians:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMusicians();
  }, []); // The empty dependency array ensures this effect runs only once

  if (loading) {
    return <div>Loading musicians...</div>;
  }

  if (musicians.length === 0) {
    return <div>No musicians found.</div>;
  }

  return (
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">Musicians</h1>
      </div>
      <div className="subhero-info">
        {totalMusicians} musician{totalMusicians !== 1 ? 's' : ''} in the tree
      </div>
      <div className="content">
        <ServerSideSearch
          contentTypeId="musician"
          searchFieldId="name"
        />
        <h2>100 most recent additions</h2>
        {musicians &&
          <ul>
            {musicians.map((musician) => (
              <li key={musician.fields.slug}>
                <Link to={`/musicians/${musician.fields.slug}`}>
                  {musician.fields.name}
                </Link>
              </li>
            ))}
          </ul>
        }
      </div>
    </>
  );
};

export default Musicians;