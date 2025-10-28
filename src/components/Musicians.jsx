import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const Musicians = () => {
  const [musicians, setMusicians] = useState([]);
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
    <div>
      <h1>Musicians</h1>
      {musicians.map((musician) => (
        <ul>
          <li key={musician.fields.slug}>
            <Link to={`/musicians/${musician.fields.slug}`}>
              {musician.fields.name}
            </Link>
          </li>
        </ul>
      ))}
    </div>
  );
};

export default Musicians;