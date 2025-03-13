import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

// Import pages
// Example: import Home from './pages/Home';
// Example: import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Online Enrollment System</h1>
      </header>
      <main>
        <Routes>
          {/* Define your routes here */}
          {/* Example: <Route path="/" element={<Home />} /> */}
          {/* Example: <Route path="/dashboard" element={<Dashboard />} /> */}
          <Route
            path="/"
            element={<div>Welcome to Online Enrollment System</div>}
          />
        </Routes>
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} Online Enrollment System</p>
      </footer>
    </div>
  );
}

export default App;
