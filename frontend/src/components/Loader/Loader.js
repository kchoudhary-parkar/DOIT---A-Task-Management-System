import React from 'react';
import './Loader.css';

export default function Loader() {
  return (
    <div id="cyber-loader">
    <div className="datastream">
      <div className="bar bar-1"></div>
      <div className="bar bar-2"></div>
      <div className="bar bar-3"></div>
      <div className="bar bar-4"></div>
      <div className="bar bar-5"></div>
      <div className="bar bar-6"></div>
      <div className="bar bar-7"></div>
      <div className="bar bar-8"></div>
    </div>
    <div className="loader-text">Synchronization in progress...</div>
  </div>
  );
}