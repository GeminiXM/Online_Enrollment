import React from 'react';
import { useClub } from '../context/ClubContext';

const footerStyles = {
  wrapper: {
    backgroundColor: '#111',
    color: '#fff',
    marginTop: '40px',
  },
  section: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
  },
  h2: { fontSize: '18px', marginTop: 0, marginBottom: '12px', color: '#fff' },
  p: { margin: '6px 0', color: '#ddd' },
  link: { color: '#9fd3ff', textDecoration: 'none' },
  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.15)',
    padding: '18px 20px',
    fontSize: '14px',
    color: '#ccc',
  },
  bottomInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
};

export default function SiteFooter() {
  const { selectedClub } = useClub();

  const club = selectedClub || {};
  const addressLine = [club.address, club.city, club.state, club.zip]
    .filter(Boolean)
    .join(' ');

  return (
    <footer className="site-footer" style={footerStyles.wrapper}>
      <div style={footerStyles.section}>
        <div style={footerStyles.grid}>
          <div>
            <h2 style={footerStyles.h2}>Information</h2>
            <p style={footerStyles.p}>
              <a href="https://wellbridge.com/fit-like-that/" style={footerStyles.link} target="_blank" rel="noreferrer">Blog</a>
            </p>
            <p style={footerStyles.p}>
              <a href="https://wellbridge.com/career-center/" style={footerStyles.link} target="_blank" rel="noreferrer">Careers</a>
            </p>
            <p style={footerStyles.p}>
              <a href="https://wellbridge.com/club-management/" style={footerStyles.link} target="_blank" rel="noreferrer">Club Management</a>
            </p>
            <p style={footerStyles.p}>
              <a href="https://wellbridge.com/privacy-policy/" style={footerStyles.link} target="_blank" rel="noreferrer">Privacy Policy</a>
            </p>
          </div>

          <div>
            <h2 style={footerStyles.h2}>Location</h2>
            {addressLine ? (
              <p style={footerStyles.p}>{addressLine}</p>
            ) : (
              <p style={footerStyles.p}>Visit our website for club locations and details.</p>
            )}
            {club.phone && (
              <p style={footerStyles.p}><a href={`tel:${club.phone}`} style={footerStyles.link}>{club.phone}</a></p>
            )}
          </div>

          <div>
            <h2 style={footerStyles.h2}>Hours</h2>
            {club.hours ? (
              <div style={footerStyles.p} dangerouslySetInnerHTML={{ __html: club.hours }} />
            ) : (
              <p style={footerStyles.p}>See the club for current hours of operation.</p>
            )}
          </div>

          <div>
            <h2 style={footerStyles.h2}>Connect</h2>
            <p style={footerStyles.p}>
              <a href="https://www.facebook.com/wellbridge" target="_blank" rel="noreferrer" style={footerStyles.link}>Facebook</a>
            </p>
            <p style={footerStyles.p}>
              <a href="https://www.instagram.com/wellbridge" target="_blank" rel="noreferrer" style={footerStyles.link}>Instagram</a>
            </p>
            <p style={footerStyles.p}>
              <a href="https://www.linkedin.com/company/wellbridge" target="_blank" rel="noreferrer" style={footerStyles.link}>LinkedIn</a>
            </p>
          </div>
        </div>
      </div>

      <div style={footerStyles.bottom}>
        <div style={footerStyles.bottomInner}>
          <a href="https://wellbridge.com/" target="_blank" rel="noreferrer" style={{ ...footerStyles.link, color: '#fff' }}>
            Wellbridge
          </a>
          <span>© {new Date().getFullYear()} All Rights Reserved.</span>
        </div>
      </div>
    </footer>
  );
}


