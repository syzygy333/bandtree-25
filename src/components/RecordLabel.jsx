import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../contentfulClient';
import { getRecordLabelName, slugifyRecordLabelName } from '../utils/recordLabels';

const RecordLabel = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { recordLabelSlug } = useParams();
  const labelSlug = recordLabelSlug || '';

  useEffect(() => {
    const fetchReleasesForLabel = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'release',
          include: 1,
          order: '-fields.year',
          limit: 1000,
        });

        const matchingReleases = (response.items || []).filter((release) => {
          const labelName = getRecordLabelName(release.fields.recordLabel);
          return slugifyRecordLabelName(labelName) === labelSlug;
        });

        setReleases(matchingReleases);
      } catch (error) {
        console.error('Error fetching releases by record label:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReleasesForLabel();
  }, [labelSlug]);

  const headingLabel = getRecordLabelName(releases[0]?.fields?.recordLabel)
    || labelSlug.replace(/-/g, ' ')
    || 'Record Label';

  if (loading) {
    return <div>Loading record label...</div>;
  }

  return (
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">{headingLabel}</h1>
      </div>
      <div className="subhero-info">
        {releases.length} release{releases.length !== 1 ? 's' : ''} attributed to this label
      </div>
      <div className="content">
        {releases.length === 0 ? (
          <p>No releases found for this record label.</p>
        ) : (
          <ul>
            {releases.map((release) => (
              <li key={release.sys.id}>
                <Link to={`/releases/${release.fields.slug}`}>
                  {release.fields.title}
                  {release.fields.year ? ` (${release.fields.year})` : ''}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default RecordLabel;
