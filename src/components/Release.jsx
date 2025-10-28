import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';

const Release = () => {
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const { releaseSlug } = useParams(); // Get the release ID from the URL

  useEffect(() => {
    const fetchRelease = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'release',
          'fields.slug': releaseSlug,
          include: 1, // Fetch up to 10 levels of linked content
        });
        
        if (response.items.length) {
          setRelease(response.items[0]);
        } else {
          setRelease(null); // Set to null if not found
        }
      } catch (error) {
        console.error("Error fetching release:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRelease();
  }, [releaseSlug]); // Re-run effect if the releaseSlug in the URL changes

  if (loading) {
    return <div>Loading release...</div>;
  }

  if (!release) {
    return <div>Release not found.</div>;
  }

  return (
    <div>
      <h1>{release.fields.title}</h1>
      <p>{release.fields.year}</p>
      {release.fields.tracks && (
        <div>
          {documentToReactComponents(release.fields.tracks)}
        </div>
      )}
      {/* Access and render the linked musicians */}
      {release.fields.musicians && (
        <div>
          <h2>Musicians</h2>
          <ul>
            {release.fields.musicians.map((musician) => (
              <li key={musician.sys.id}>
                <Link to={`/musician/${musician.fields.slug}`}>
                  {musician.fields.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Release;