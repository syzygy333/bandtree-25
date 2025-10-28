import { createClient } from 'contentful';

const space = import.meta.env.VITE_REACT_APP_CONTENTFUL_SPACE_ID;
const accessToken = import.meta.env.VITE_REACT_APP_CONTENTFUL_ACCESS_TOKEN;

if (!space || !accessToken) {
  throw new Error('Contentful space ID and access token must be provided.');
}

const client = createClient({
  space: space,
  accessToken: accessToken,
});

export default client;