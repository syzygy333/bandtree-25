import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const Band = () => {
  const [band, setBand] = useState(null);
  const [connectedBands, setConnectedBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const { bandSlug } = useParams(); // Get the band ID from the URL

  useEffect(() => {
    const fetchBand = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'band',
          'fields.slug': bandSlug,
          include: 3, // fetch linked releases + musicians
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

  useEffect(() => {
    const fetchConnectedBands = async () => {
      if (!band) return;

      // Build a set of musician IDs that appear on this band's releases
      // This could eventually impact performance if the number of bands grows
      // since it currently fetches all bands to compute connections
      const musicianIds = new Set(
        (band.fields.releases || []).flatMap((release) =>
          (release.fields?.musicians || []).map((musician) => musician.sys.id)
        )
      );

      if (musicianIds.size === 0) {
        setConnectedBands([]);
        return;
      }

      try {
        const response = await client.getEntries({
          content_type: 'band',
          order: 'fields.name',
          include: 3, // ensure linked releases/musicians are available
        });

        const connections = [];
        const seen = new Set();

        response.items.forEach((otherBand) => {
          if (otherBand.sys.id === band.sys.id) return;

          const otherMusicianIds = new Set(
            (otherBand.fields.releases || []).flatMap((release) =>
              (release.fields?.musicians || []).map((musician) => musician.sys.id)
            )
          );

          // Check if there is any shared musician
          const hasSharedMusician = [...musicianIds].some((id) =>
            otherMusicianIds.has(id)
          );

          if (hasSharedMusician && !seen.has(otherBand.sys.id)) {
            seen.add(otherBand.sys.id);
            connections.push(otherBand);
          }
        });

        setConnectedBands(connections);
      } catch (error) {
        console.error('Error fetching connected bands:', error);
      }
    };

    fetchConnectedBands();
  }, [band]);

  if (loading) {
    return <div>Loading band...</div>;
  }

  if (!band) {
    return <div>Band not found.</div>;
  }
  
  // Define the sorting function
  const sortReleasesByYearDesc = (releases) => {
    // Create a copy of the array using slice() to avoid mutating the state directly
    return [...releases].sort((a, b) => {
      // For descending order (latest year first): b.fields.year - a.fields.year
      return b.fields.year - a.fields.year;
    });
  };
  
  let heroStyle = {};
  const mediaField = band.fields.media;
  if (mediaField && mediaField.fields && mediaField.fields.file) {
    const imageUrl = mediaField.fields.file.url;
    heroStyle = {
      backgroundImage: `url(${imageUrl})`
    };
  } else {
    // The media field is empty or missing data
    heroStyle = {};
  }
  
  // Sort the releases before rendering
  const sortedReleases = band.fields.releases ? sortReleasesByYearDesc(band.fields.releases) : [];

  return (
    <>
      <div className="hero band content-before" style={heroStyle ? heroStyle : ''}>
        <h1 className="hero-heading">{band.fields.name}</h1>
      </div>
      <div className="content">
        <article className="band-content">
          {sortedReleases.length > 0 && (
            <>
              <h2>Releases</h2>
              <ul>
                {sortedReleases.map((release) => (
                  <li key={release.sys.id}>
                    <Link to={`/releases/${release.fields.slug}`}>
                      {release.fields.title} ({release.fields.year})
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {connectedBands.length > 0 && (
            <>
              <h2>Connected Bands</h2>
              <ul>
                {connectedBands.map((connectedBand) => (
                  <li key={connectedBand.sys.id}>
                    <Link to={`/bands/${connectedBand.fields.slug}`}>
                      {connectedBand.fields.name}
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
