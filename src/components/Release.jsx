import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { getConnectionCountsByMusicianId, getReleaseCountsByMusicianId } from '../utils/musicianConnections';

const Release = () => {
  const [release, setRelease] = useState(null);
  const [band, setBand] = useState(null);
  const [musicianConnectionCounts, setMusicianConnectionCounts] = useState({});
  const [musicianReleaseCounts, setMusicianReleaseCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const { releaseSlug } = useParams(); // Get the release ID from the URL

  useEffect(() => {
    const fetchRelease = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'release',
          'fields.slug': releaseSlug,
          include: 2, // Fetch linked content
        });
        
        if (response.items.length) {
          const releaseData = response.items[0];
          setRelease(releaseData);

          const creditedMusicians = Array.isArray(releaseData.fields.musicians)
            ? releaseData.fields.musicians
            : [];
          const creditedMusicianIds = creditedMusicians.map((musician) => musician.sys.id);

          if (creditedMusicianIds.length) {
            const relatedReleasesResponse = await client.getEntries({
              content_type: 'release',
              'fields.musicians.sys.id[in]': creditedMusicianIds.join(','),
              select: 'fields.musicians',
              include: 1,
              limit: 1000,
            });

            const connectionCountsByMusicianId = getConnectionCountsByMusicianId(
              relatedReleasesResponse.items,
              creditedMusicianIds
            );
            const releaseCountsByMusicianId = getReleaseCountsByMusicianId(
              relatedReleasesResponse.items,
              creditedMusicianIds
            );

            setMusicianConnectionCounts(connectionCountsByMusicianId);
            setMusicianReleaseCounts(releaseCountsByMusicianId);
          } else {
            setMusicianConnectionCounts({});
            setMusicianReleaseCounts({});
          }
          
          // Find the band that has this release in its releases array
          const bandResponse = await client.getEntries({
            content_type: 'band',
            'fields.releases.sys.id': releaseData.sys.id,
            include: 1,
          });
          
          if (bandResponse.items.length) {
            setBand(bandResponse.items[0]);
          }
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
  
  let heroStyle = {};
  const mediaField = release.fields.media;
  if (mediaField && mediaField.fields && mediaField.fields.file) {
    const imageUrl = mediaField.fields.file.url;
    heroStyle = {
      backgroundImage: `url(${imageUrl})`
    };
  } else {
    // The media field is empty or missing data
    heroStyle = {};
  }

  return (
    <>
      <div className="hero release content-before" style={heroStyle ? heroStyle : ''}>
        <h1 className="hero-heading">{release.fields.title}</h1>
      </div>
      {band && (
        <div className="subhero-info">
          By <Link to={`/bands/${band.fields.slug}`}>
            {band.fields.name}
          </Link>
          {/* to-do: account for releases with more than 1 band */}
        </div>
      )}
      <div className="content">
        <article className="release-content">
          <div className="release-content__left">
            {/* Access and render the linked musicians */}
            {release.fields.musicians && (
              <div>
                <h2>Credits</h2>
                <ul>
                  {release.fields.musicians.map((musician) => (
                    <li key={musician.sys.id}>
                      <Link to={`/musicians/${musician.fields.slug}`}>
                        {musician.fields.name} ({musicianConnectionCounts[musician.sys.id] ?? 0} connections across {musicianReleaseCounts[musician.sys.id] ?? 0} release{(musicianReleaseCounts[musician.sys.id] ?? 0) !== 1 ? 's' : ''})
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              // note that some people listed here might be non-musicians (engineers, producers, etc.)
            )}
          </div>
          <div className="release-content__right">
            <div>
              <h2>Year</h2>
              <p>{release.fields.year}</p>
            </div>
            {release.fields.tracks && (
              <div>
                <h2>Tracks</h2>
                {documentToReactComponents(release.fields.tracks)}
              </div>
            )}
            {/* to-do
            <div>
              <h2>Label</h2>
              <p>{release.fields.recordLabel}</p>
            </div>
            <div>
              <h2>Catalog Number</h2>
              <p>{release.fields.catalogNumber}</p>
            </div> */}
          </div>
        </article>
    </div>
    </>
  );
};

export default Release;