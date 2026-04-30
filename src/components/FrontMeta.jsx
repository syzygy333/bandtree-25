import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import {
  fetchMostConnectedBand,
  fetchMostConnectedMusician,
} from '../utils/featuredConnections';

const FrontMeta = () => {
  // 1. useState to store the count and handle loading/error states
  const [counts, setCounts] = useState({});
  const [topBand, setTopBand] = useState(null);
  const [topMusician, setTopMusician] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [band, release, musician, recordLabel, mostConnectedBand, mostConnectedMusician] = await Promise.all([
          client.getEntries({ content_type: 'band', limit: 0 }),
          client.getEntries({ content_type: 'release', limit: 0 }),
          client.getEntries({ content_type: 'musician', limit: 0 }),
          client.getEntries({ content_type: 'recordLabel', limit: 0 }),
          fetchMostConnectedBand(),
          fetchMostConnectedMusician(),
        ]);
  
        setCounts({
          bands: band.total,
          releases: release.total,
          musicians: musician.total,
          recordLabels: recordLabel.total,
        });
        setTopBand(mostConnectedBand);
        setTopMusician(mostConnectedMusician);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchCounts();
  }, []); // The empty array runs this effect only once on mount
  
  if (isLoading) {
    return <div>Loading entry counts...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  // 4. Display the count from the state
  return (
    <>
      <div className="homepage hero">
        <h1 className="homepage-site-title hero-heading">Bandtree</h1>
        <p className="homepage-tagline">explore how your favorite musician or band branches out</p>
      </div>
      <div className="content">
        <div className="homepage-intro">
          <h2>
            {`
              The tree has ${counts.bands} bands,
              ${counts.releases} releases,
              ${counts.musicians} musicians,
              and ${counts.recordLabels} record labels
            `}
          </h2>
          {topMusician && (
            <p>
              <Link to={`/musicians/${topMusician.fields.slug}`}>
                {topMusician.fields.name}
              </Link>
              {`
                is the most connected musician (connected to
                ${topMusician.uniqueCollaboratorCount}
                other musicians)
              `}
            </p>
          )}
          {topBand && (
            <p>
              <Link to={`/bands/${topBand.band.fields.slug}`}>
                {topBand.band.fields.name}
              </Link>
              {`
                is the most connected band (connected to
                ${topBand.connectionsCount} other
                band${topBand.connectionsCount !== 1 ? 's' : ''}
                via shared musicians)
              `}
            </p>
          )}
        </div>
        <p>
          Bandtree is a personal project that uses as its basis first-hand sources (liner notes) to catalog and keep track of musical relations. Thus, its dataset is limited (but you're in luck if you're into Chicago-based bands from the late 90s and early aughts). We'd love to expand beyond this (exponentially) and are working on it, but it won't likely happen soon. For now, enjoy what's here.
        </p>
      </div>
    </>
  );
};

export default FrontMeta;