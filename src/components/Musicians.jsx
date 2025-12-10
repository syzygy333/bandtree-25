import React, { useEffect, useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';
import ServerSideSearch from './Search';

const Musicians = () => {
  const [musicians, setMusicians] = useState([]);
  const [totalMusicians, setTotalMusicians] = useState(0);
  const [topMusician, setTopMusician] = useState(null);
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
    
    const findMostConnected = async () => {
      try {
        // Step 1: Fetch ALL releases and their linked musicians
        const releasesResponse = await client.getEntries({
          content_type: 'release',
          select: 'fields.musicians', // We only need the musician links
          limit: 1000, 
        });

        // Step 2: Build a map of unique collaborators for every musician ID
        // Structure: { 'musicianId1': Set(['collabIdA', 'collabIdB']), 'musicianId2': Set(['collabIdA']), ... }
        const collaborationMap = {};

        releasesResponse.items.forEach(release => {
          const linkedMusicians = release.fields.musicians || [];
          if (linkedMusicians.length > 1) { // Only consider releases with more than one musician
            const musicianIdsInRelease = linkedMusicians.map(m => m.sys.id);
            
            musicianIdsInRelease.forEach(musicianId => {
              // Ensure the musician entry exists in our map
              if (!collaborationMap[musicianId]) {
                collaborationMap[musicianId] = new Set();
              }

              // Add every *other* musician from this release to their set of unique collaborators
              musicianIdsInRelease.forEach(otherMusicianId => {
                if (musicianId !== otherMusicianId) {
                  collaborationMap[musicianId].add(otherMusicianId);
                }
              });
            });
          }
        });

        // Step 3: Identify the musician ID with the largest Set of collaborators
        let maxUniqueCollaborators = 0;
        let mostConnectedMusicianId = null;

        for (const musicianId in collaborationMap) {
          const uniqueCount = collaborationMap[musicianId].size;
          if (uniqueCount > maxUniqueCollaborators) {
            maxUniqueCollaborators = uniqueCount;
            mostConnectedMusicianId = musicianId;
          }
        }

        // Step 4: Fetch details for *only* the top musician
        if (mostConnectedMusicianId) {
          const musicianDetailsResponse = await client.getEntry(mostConnectedMusicianId);
          
          // Attach the unique collaborator count for display
          musicianDetailsResponse.uniqueCollaboratorCount = maxUniqueCollaborators; 
          setTopMusician(musicianDetailsResponse);
        }
      
      } catch (error) {
        console.error("Error finding most connected musician:", error);
      } finally {
        setLoading(false);
      }
    };
    findMostConnected();
    
  }, []); // The empty dependency array ensures this effect runs only once

  if (loading) {
    return <div>Loading musicians...</div>;
  }

  if (musicians.length === 0) {
    return <div>No musicians found.</div>;
  }
  
  if (!topMusician) {
    return <div>No connected musicians found.</div>;
  }

  return (
    <>
      <div className="hero content-before">
        <h1 className="hero-heading">Musicians</h1>
      </div>
      <div className="subhero-info">
        {totalMusicians} musician{totalMusicians !== 1 ? 's' : ''} in the tree
      </div>
      <div className="content musicians">
        <ServerSideSearch
          contentTypeId="musician"
          searchFieldId="name"
        />
        <h2>The most connected musician</h2>
        <p>
          <Link to={`/musicians/${topMusician.fields.slug}`}>
            {topMusician.fields.name}
          </Link> is the most connected musician ({topMusician.uniqueCollaboratorCount} connections).
        </p>
        <h2>100 most recent updates</h2>
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