// frontend/src/components/LandingPage.jsx
// This component serves as the landing page before users access the enrollment form
// It provides information about membership options and benefits

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClub } from "../context/ClubContext";
import { useMembership } from "../context/MembershipContext";
import MembershipTypeModal from "./MembershipTypeModal";
import "./LandingPage.css";

function LandingPage() {
  const { selectedClub } = useClub();
  const navigate = useNavigate();
  const [showMembershipTypeModal, setShowMembershipTypeModal] = useState(false);
  
  // Handle membership type selection
  const handleMembershipTypeSelect = (type) => {
    setShowMembershipTypeModal(false);
    // Navigate to enrollment form - no need to pass state as it's in context
    navigate("/enrollment");
  };
  
  return (
    <div className="landing-container">
      {/* Membership Type Modal */}
      <MembershipTypeModal 
        isOpen={showMembershipTypeModal} 
        onClose={() => setShowMembershipTypeModal(false)}
        onSelectMembershipType={handleMembershipTypeSelect}
      />
      
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome to {selectedClub.name}</h1>
          <p className="tagline">Your journey to fitness and wellness starts here</p>
          <button 
            onClick={() => setShowMembershipTypeModal(true)} 
            className="cta-button"
          >
            Become a Member
          </button>
        </div>
      </section>

      <section className="membership-options">
        <h2>Membership Options</h2>
        <div className="options-container">
          <div className="membership-card">
            <div className="card-header">
              <h3>Standard Membership</h3>
              <p className="price">$49.99<span>/month</span></p>
            </div>
            <div className="card-body">
              <ul className="benefits-list">
                <li>Unlimited gym access</li>
                <li>Locker room access</li>
                <li>Free fitness assessment</li>
                <li>Access to all basic facilities</li>
              </ul>
              <button 
                onClick={() => setShowMembershipTypeModal(true)} 
                className="select-button"
              >
                Select Plan
              </button>
            </div>
          </div>

          <div className="membership-card featured">
            <div className="card-header">
              <h3>Family Membership</h3>
              <p className="price">$79.99<span>/month</span></p>
            </div>
            <div className="card-body">
              <ul className="benefits-list">
                <li>All Standard Membership benefits</li>
                <li>Add up to 4 family members</li>
                <li>Discounted rates for additional members</li>
                <li>Family fitness activities</li>
              </ul>
              <button 
                onClick={() => setShowMembershipTypeModal(true)} 
                className="select-button"
              >
                Select Plan
              </button>
            </div>
          </div>

          <div className="membership-card">
            <div className="card-header">
              <h3>Premium Membership</h3>
              <p className="price">$89.99<span>/month</span></p>
            </div>
            <div className="card-body">
              <ul className="benefits-list">
                <li>All Family Membership benefits</li>
                <li>Personal training sessions (2/month)</li>
                <li>Access to premium classes</li>
                <li>Nutrition consultation</li>
              </ul>
              <button 
                onClick={() => setShowMembershipTypeModal(true)} 
                className="select-button"
              >
                Select Plan
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose {selectedClub.name}?</h2>
        <div className="features-container">
          <div className="feature">
            <div className="feature-icon">🏋️</div>
            <h3>State-of-the-Art Equipment</h3>
            <p>Access to the latest fitness equipment and technology to help you reach your goals.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👨‍👩‍👧‍👦</div>
            <h3>Family-Friendly Environment</h3>
            <p>Programs and facilities designed for members of all ages and fitness levels.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👨‍🏫</div>
            <h3>Expert Trainers</h3>
            <p>Our certified trainers provide personalized guidance to help you achieve your fitness goals.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🏊</div>
            <h3>Diverse Amenities</h3>
            <p>From swimming pools to basketball courts, we offer a wide range of facilities.</p>
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <h2>What Our Members Say</h2>
        <div className="testimonials-container">
          <div className="testimonial">
            <p>"Joining {selectedClub.name} was one of the best decisions I've made. The facilities are excellent and the staff is incredibly supportive."</p>
            <p className="testimonial-author">- Sarah J.</p>
          </div>
          <div className="testimonial">
            <p>"As a family of four, we love the variety of activities available for all ages. The family membership is a great value!"</p>
            <p className="testimonial-author">- The Williams Family</p>
          </div>
          <div className="testimonial">
            <p>"The trainers here really know their stuff. I've seen more progress in 3 months than I did in years at my old gym."</p>
            <p className="testimonial-author">- Michael T.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Start Your Fitness Journey?</h2>
        <p>Join {selectedClub.name} today and take the first step toward a healthier lifestyle.</p>
        <button 
          onClick={() => setShowMembershipTypeModal(true)} 
          className="cta-button"
        >
          Enroll Now
        </button>
      </section>
    </div>
  );
}

export default LandingPage; 