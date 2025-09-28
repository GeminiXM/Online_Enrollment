import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import EnrollmentForm from "./components/EnrollmentForm.jsx";
import LandingPage from "./components/LandingPage.jsx";
import EnrollmentConfirmation from "./components/EnrollmentConfirmation.jsx";
import ContractPage from "./components/ContractPage.jsx";
import PaymentPage from "./components/PaymentPage.jsx";
//import PaymentProcessorDemo from "./components/PaymentProcessorDemo.jsx";
import FluidPayPayment from "./components/FluidPayPayment.jsx";
import ClubLinks from "./components/ClubLinks.jsx";
import ConvergeHPPTest from "./components/ConvergeHPPTest.jsx";
import ConvergePaymentPage from "./components/ConvergePaymentPage.jsx";
import FluidPayPaymentPage from "./components/FluidPayPaymentPage.jsx";
import FluidPayTest from "./components/FluidPayTest.jsx";
import FluidPayModalTest from "./components/FluidPayModalTest.jsx";
//import ConvergeCheckoutTest from "./components/ConvergeCheckoutTest.jsx";
//import DirectPaymentTest from "./components/DirectPaymentTest.jsx";
// import ContractSaveTest from "./components/ContractSaveTest.jsx";
import { ClubProvider, useClub } from "./context/ClubContext";
import { MembershipProvider } from "./context/MembershipContext";

// Import pages
// Example: import Home from './pages/Home.js';
// Example: import Dashboard from './pages/Dashboard.js';

// Club selector component
function ClubSelector() {
  const { clubList, selectedClub, changeClub } = useClub();

  return (
    <div className="club-selector">
      <label htmlFor="club-select" className="visually-hidden">
        Select Club
      </label>
      <select
        id="club-select"
        value={selectedClub.id}
        onChange={(e) => changeClub(e.target.value)}
        className="club-dropdown"
        aria-label="Select Club"
      >
        {clubList.map((club) => (
          <option key={club.id} value={club.id}>
            {club.id} - {club.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Main App component
function AppContent() {
  const { selectedClub, changeClub } = useClub();
  const location = window.location;
  const [headerVisible, setHeaderVisible] = React.useState(true);

  // Handle club selection from URL parameters
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clubId = params.get("clubId");
    if (clubId) {
      changeClub(clubId);
    }
  }, [location.search, changeClub]);

  // Update document title when selected club changes
  React.useEffect(() => {
    document.title = `${selectedClub.name} - Membership Enrollment`;
  }, [selectedClub]);

  // Toggle header visibility
  const toggleHeader = React.useCallback(() => {
    setHeaderVisible(!headerVisible);
  }, [headerVisible]);

  // Keyboard shortcut to toggle header (H key)
  React.useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "h" || event.key === "H") {
        toggleHeader();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [headerVisible, toggleHeader]);

  return (
    <div className="App">
      {/* Header Toggle Button */}
      <button
        onClick={toggleHeader}
        className="header-toggle-btn"
        title={headerVisible ? "Hide Header" : "Show Header"}
      >
        {headerVisible ? "▼" : "▲"}
      </button>

      {/* Conditional Header */}
      {headerVisible && (
        <header className="App-header">
          <div className="header-content">
            <h1>
              <Link to="/" className="logo-link">
                {selectedClub.name}
              </Link>
            </h1>
            <div className="header-right">
              <ClubSelector />
              <nav className="main-nav">
                <ul>
                  {/*                   <li>
                    <Link to="/">Home</Link>
                  </li> */}
                  <li>
                    <Link to="/enrollment">Enrollment</Link>
                  </li>
                  <li>
                    <Link to="/club-links">Club Links</Link>
                  </li>
                  <li>
                    <Link to="/convergehpptest">Converge HPP Test</Link>
                  </li>

                  <li>
                    <Link to="/converge-payment">Converge Payment</Link>
                  </li>
                  <li>
                    <Link to="/fluidpaytest">FluidPay Test</Link>
                  </li>
                  <li>
                    <Link to="/fluidpaymodal">
                      FluidPay Modal (Real Payments)
                    </Link>
                  </li>
                  {/* <li>
                    <Link to="/contract-save-test">Contract Save Test</Link>
                  </li>
                  <li>
                    <Link to="/converge-checkout-test">
                      Converge Checkout Test
                    </Link>
                  </li>
                  <li>
                    <Link to="/direct-payment-test">Direct Payment Test</Link>
                  </li> */}
                </ul>
              </nav>
            </div>
          </div>
        </header>
      )}
      <main>
        <Routes>
          {/* Define your routes here */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/index.html" element={<LandingPage />} />{" "}
          {/* Add explicit index.html route */}
          <Route path="/enrollment" element={<EnrollmentForm />} />
          <Route path="/contract" element={<ContractPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/club-links" element={<ClubLinks />} />
          <Route path="/payment-fluidpay" element={<FluidPayPayment />} />
          <Route path="/convergehpptest" element={<ConvergeHPPTest />} />
          <Route path="/converge-payment" element={<ConvergePaymentPage />} />
          <Route path="/fluidpay-payment" element={<FluidPayPaymentPage />} />
          <Route path="/fluidpaytest" element={<FluidPayTest />} />
          <Route path="/fluidpaymodal" element={<FluidPayModalTest />} />
          <Route
            path="/enrollment-confirmation"
            element={<EnrollmentConfirmation />}
          />
          {/* <Route
            path="/converge-checkout-test"
            element={<ConvergeCheckoutTest />}
          />
          <Route path="/direct-payment-test" element={<DirectPaymentTest />} /> */}
          {/* Add more routes as needed */}
        </Routes>
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} Wellbridge Enrollment System</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ClubProvider>
      <MembershipProvider>
        <AppContent />
      </MembershipProvider>
    </ClubProvider>
  );
}

export default App;
