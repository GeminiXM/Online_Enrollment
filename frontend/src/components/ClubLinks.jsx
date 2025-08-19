import React from 'react';
import { Link } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import './ClubLinks.css';

const ClubLinks = () => {
  const { clubList } = useClub();

  // Group clubs by state
  const newMexicoClubs = clubList.filter(club => club.state === 'NM');
  const coloradoClubs = clubList.filter(club => club.state === 'CO');

  return (
    <div className="club-links-container">
      <h1>Direct Club Enrollment Links</h1>
      <p>Click on any club below to go directly to their enrollment form:</p>
      
      <div className="clubs-section">
        <h2>New Mexico Clubs</h2>
        <div className="clubs-grid">
          {newMexicoClubs.map(club => (
            <div key={club.id} className="club-card">
              <h3>{club.name}</h3>
              <p className="club-address">{club.address}</p>
              <p className="club-phone">{club.phone}</p>
              <div className="club-links">
                <Link 
                  to={`/enrollment?clubId=${club.id}`} 
                  className="enrollment-link"
                >
                  Start Enrollment
                </Link>
                <Link 
                  to={`/?clubId=${club.id}`} 
                  className="home-link"
                >
                  Visit Homepage
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="clubs-section">
        <h2>Colorado Clubs</h2>
        <div className="clubs-grid">
          {coloradoClubs.map(club => (
            <div key={club.id} className="club-card">
              <h3>{club.name}</h3>
              <p className="club-address">{club.address}</p>
              <p className="club-phone">{club.phone}</p>
              <div className="club-links">
                <Link 
                  to={`/enrollment?clubId=${club.id}`} 
                  className="enrollment-link"
                >
                  Start Enrollment
                </Link>
                <Link 
                  to={`/?clubId=${club.id}`} 
                  className="home-link"
                >
                  Visit Homepage
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="direct-links-section">
        <h2>Direct URL Links</h2>
        <p>You can also use these direct URLs:</p>
        <div className="url-list">
          {clubList.map(club => (
            <div key={club.id} className="url-item">
              <strong>{club.shortName || club.name}:</strong>
              <code>{window.location.origin}/enrollment?clubId={club.id}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClubLinks;
