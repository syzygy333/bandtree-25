import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import '@awesome.me/webawesome/dist/components/icon/icon.js';

const FrontMeta = () => {
  // 1. useState to store the count and handle loading/error states
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [band, release, musician] = await Promise.all([
          client.getEntries({ content_type: 'band', limit: 0 }),
          client.getEntries({ content_type: 'release', limit: 0 }),
          client.getEntries({ content_type: 'musician', limit: 0 }),
        ]);
  
        setCounts({
          bands: band.total,
          releases: release.total,
          musicians: musician.total,
        });
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
  
  const iconStyle = {
    marginInline: '0.25em'
  };
  
  // 4. Display the count from the state
  return (
    <div className="homepage hero">
      <h1 className="homepage-site-title hero-heading">Bandtree</h1>
      <div className="homepage-stats">
        <p>Find out how your favorite musician connects to your other favorite musicians</p>
        <h2>
          The tree has 
          <div>
            {counts.bands} bands 
            <wa-icon style={iconStyle} family="duotone" name="guitars" data-fa-kit-code="03193d7d12"></wa-icon>
          </div>
          <div>
            {counts.releases} releases 
            <wa-icon style={iconStyle} family="duotone" name="record-vinyl"></wa-icon>
          </div>
          <div>
            and {counts.musicians} musicians
            <wa-icon style={iconStyle} family="duotone" name="user-music"></wa-icon>
          </div>
        </h2>
      </div>
      {/* to-do: the most well-connected artist is */}
    </div>
  );
};

export default FrontMeta;