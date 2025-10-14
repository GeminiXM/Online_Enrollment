import React from 'react';
import { useClub } from '../context/ClubContext';
import WellbridgeLogo from '../assets/images/wellbridge_white_95c93d.svg';

const footerStyles = {
  wrapper: {
    backgroundColor: '#0082B5',
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
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: '12px',
  },
  bottomLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  bottomCenter: {
    gridColumn: '2',
    justifySelf: 'center',
    textAlign: 'center',
  },
  logo: {
    height: '28px',
    display: 'block',
  },
  social: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  }
};

export default function SiteFooter() {
  const { selectedClub } = useClub();

  const club = selectedClub || {};
  const addressParts = [club.address, club.city, club.state, club.zip].filter(Boolean);
  const addressLine = addressParts.join(' ');
  const encodedAddress = addressLine ? encodeURIComponent(addressLine) : '';
  const directionsUrl = encodedAddress ? `https://maps.google.com/maps?saddr=&daddr=${encodedAddress}` : null;
  const mapEmbedSrc = encodedAddress ? `https://www.google.com/maps?q=${encodedAddress}&output=embed` : null;

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
              <p style={footerStyles.p}>
                <a href={directionsUrl} target="_blank" rel="noreferrer" style={footerStyles.link}>
                  {addressLine}
                </a>
              </p>
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
            <h2 style={footerStyles.h2}>Map</h2>
            {mapEmbedSrc ? (
              <div style={{ marginTop: '6px' }}>
                <iframe
                  title="Club Location Map"
                  src={mapEmbedSrc}
                  width="100%"
                  height="160"
                  style={{ border: 0, borderRadius: '6px' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-label="Map showing club location"
                />
              </div>
            ) : (
              <p style={footerStyles.p}>Map will appear when an address is available.</p>
            )}
          </div>
        </div>
      </div>
                          <div class="flex-row columns-2">
    
                        <div class="column whitespace-less">
                            <p >Wellbridge has successfully managed fitness properties across the country. With an intimate knowledge of boutique, full-service spas and residential athletic clubs, to large-scale, employee-only corporate fitness centers, we continue to define the fitness industry’s best practices.</p>
        <br></br>                
        </div>
                    </div>
      <div style={footerStyles.bottom}>
        <div style={footerStyles.bottomInner}>
          <div style={footerStyles.bottomLeft}>
            <a href="https://wellbridge.com/" target="_blank" rel="noreferrer" style={{ ...footerStyles.link, color: '#fff' }}>
              <img src={WellbridgeLogo} alt="Wellbridge" style={footerStyles.logo} />
            </a>
          </div>
          <div style={footerStyles.bottomCenter}>
            <span>© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          <div style={footerStyles.social}>
            <a href="https://www.facebook.com/wellbridge" target="_blank" rel="noreferrer" style={footerStyles.link}>Facebook</a>
            <a href="https://www.instagram.com/wellbridge" target="_blank" rel="noreferrer" style={footerStyles.link}>Instagram</a>
            <a href="https://www.linkedin.com/company/wellbridge" target="_blank" rel="noreferrer" style={footerStyles.link}>LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}


