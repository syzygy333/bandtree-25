import React, { useState } from 'react';
import client from '../contentfulClient';
import { Link } from 'react-router-dom';

const ServerSideSearch = ({ contentTypeId, searchFieldId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSearchResults = async (query) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      // Dynamically construct query parameter key
      const queryParamKey = `fields.${searchFieldId}[match]`;

      const response = await client.getEntries({
        content_type: contentTypeId,
        [queryParamKey]: query,
        include: 2,
        order: `fields.${searchFieldId}`,
      });
      setSearchResults(response.items);
    } catch (error) {
      setError(error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event) => {
    setSearchTerm(event.target.value);
    // Reset 'hasSearched' state when user starts typing again
    // This clears the 'no results' message if they modify their query
    if (hasSearched) {
      setHasSearched(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (searchTerm.trim()) {
      fetchSearchResults(searchTerm.trim());
    } else {
      // If input is empty on submit, clear results and indicate a search was attempted
      setSearchResults([]);
      setHasSearched(true);
    }
  };
  
  const showNoResultsMessage = 
    hasSearched &&         // We must have pressed submit at least once
    !isLoading &&          // We are not currently loading
    searchResults.length === 0; // There are no results

  return (
    <div className="search">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={`Search ${searchFieldId} in ${contentTypeId}...`}
          value={searchTerm}
          onChange={handleChange}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {searchResults.length > 0 && (
        <>
          <h2>Search Results:</h2>
          <ul>
            {searchResults.map((entry) => (
              <li key={entry.sys.id}>
                <Link to={`/musicians/${entry.fields.slug}`}>
                  {entry.fields[searchFieldId]}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {showNoResultsMessage && <p>No results found for "{searchTerm}"</p>}
    </div>
  );
};

export default ServerSideSearch;