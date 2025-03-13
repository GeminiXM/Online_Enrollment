import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import EnrollmentForm from "./components/EnrollmentForm.jsx";

// Import pages
// Example: import Home from './pages/Home.js';
// Example: import Dashboard from './pages/Dashboard.js';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Fitness Facility Enrollment</h1>
      </header>
      <main>
        <Routes>
          {/* Define your routes here */}
          <Route path="/" element={<EnrollmentForm />} />
          <Route path="/enrollment" element={<EnrollmentForm />} />
          {/* Add more routes as needed */}
        </Routes>
      </main>
      <footer>
        <p>
          &copy; {new Date().getFullYear()} Fitness Facility Enrollment System
        </p>
      </footer>
    </div>
  );
}

export default App;
