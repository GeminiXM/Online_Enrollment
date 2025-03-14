import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import EnrollmentForm from "./components/EnrollmentForm.jsx";
import LandingPage from "./components/LandingPage.jsx";

// Import pages
// Example: import Home from './pages/Home.js';
// Example: import Dashboard from './pages/Dashboard.js';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>
            <Link to="/" className="logo-link">
              Tabor Center
            </Link>
          </h1>
          <nav className="main-nav">
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/enrollment">Enrollment</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          {/* Define your routes here */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/enrollment" element={<EnrollmentForm />} />
          {/* Add more routes as needed */}
        </Routes>
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} Wellbridge Enrollment System</p>
      </footer>
    </div>
  );
}

export default App;
