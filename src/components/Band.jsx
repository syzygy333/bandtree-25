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
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">{band.fields.name}</h1>
      </div>
      <div className="content">
        <article className="band-content">
          {/* Access and render the linked releases */}
          {band.fields.releases && (
            <>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed in egestas massa. Ut a arcu ut purus pellentesque pellentesque a a mauris. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus tincidunt varius neque, a ornare erat semper vitae. Nulla facilisi. Cras lacinia dui faucibus dolor dapibus, eu aliquam enim rhoncus. Proin non tempor arcu. Maecenas maximus neque quam, sit amet feugiat massa porta consequat. Nullam consequat a magna rutrum tempor. Pellentesque vehicula urna in eros laoreet rhoncus. Pellentesque elementum neque ut arcu lacinia euismod. Aliquam a ultrices lacus. Maecenas vitae dapibus lectus. In volutpat orci velit, non laoreet nibh varius at. Mauris scelerisque ligula eu consectetur dignissim.</p>
              <h2>Releases</h2>
              <ul>
                {band.fields.releases.map((release) => (
                  <li key={release.sys.id}>
                    <Link to={`/releases/${release.fields.slug}`}>
                      {release.fields.title} ({release.fields.year})
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </div>
    </>
  );
};

export default Band;
