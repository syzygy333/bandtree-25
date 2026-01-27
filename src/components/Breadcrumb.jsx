import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

const Breadcrumb = ({ itemName }) => {
  const location = useLocation();
  const params = useParams();
  
  // Build breadcrumb items based on the current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ label: 'Home', path: '/' }];
    
    // Check if we're on a detail page first
    if (params.bandSlug) {
      crumbs.push({ label: 'Bands', path: '/bands' });
      if (itemName) {
        crumbs.push({ label: itemName, path: path, isActive: true });
      }
    } else if (params.releaseSlug) {
      crumbs.push({ label: 'Releases', path: '/releases' });
      if (itemName) {
        crumbs.push({ label: itemName, path: path, isActive: true });
      }
    } else if (params.musicianSlug) {
      crumbs.push({ label: 'Musicians', path: '/musicians' });
      if (itemName) {
        crumbs.push({ label: itemName, path: path, isActive: true });
      }
    } else {
      // We're on a collection page
      if (path.startsWith('/bands')) {
        crumbs.push({ label: 'Bands', path: '/bands', isActive: true });
      } else if (path.startsWith('/releases')) {
        crumbs.push({ label: 'Releases', path: '/releases', isActive: true });
      } else if (path.startsWith('/musicians')) {
        crumbs.push({ label: 'Musicians', path: '/musicians', isActive: true });
      }
    }
    
    return crumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();
  
  // Don't show breadcrumbs on the home page
  if (location.pathname === '/') {
    return null;
  }
  
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path}>
            {crumb.isActive ? (
              <span aria-current="page">{crumb.label}</span>
            ) : (
              <Link to={crumb.path}>{crumb.label}</Link>
            )}
            {index < breadcrumbs.length - 1 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                {' > '}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;

