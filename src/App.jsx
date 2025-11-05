import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Bands from './components/Bands';
import Band from './components/Band';
import FrontMeta from './components/FrontMeta';
import Musicians from './components/Musicians';
import Musician from './components/Musician';
import Releases from './components/Releases';
import Release from './components/Release';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <nav className="bt-nav">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/bands">Bands</Link></li>
            <li><Link to="/releases">Releases</Link></li>
            <li><Link to="/musicians">Musicians</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<FrontMeta />} />
          {/* Routes for collection pages */}
          <Route path="/bands" element={<Bands />} />
          <Route path="/releases" element={<Releases />} />
          <Route path="/musicians" element={<Musicians />} />
          {/* Dynamic routes for single pages */}
          <Route path="/bands/:bandSlug" element={<Band />} />
          <Route path="/releases/:releaseSlug" element={<Release />} />
          <Route path="/musician/:musicianSlug" element={<Musician />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;