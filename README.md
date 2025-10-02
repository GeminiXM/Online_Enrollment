# Online Enrollment System

A web application for managing online enrollment processes for Wellbridge fitness centers, built with React frontend and Node.js backend connecting to Informix databases.

## Project Overview

The Online Enrollment System is designed to streamline the membership enrollment process for Wellbridge fitness centers. It provides a user-friendly interface for prospective members to select membership types, enter personal information, add family members, and select additional services.

## Project Structure

```
Online_Enrollment/
├── .env                     # Root environment variables (shared between frontend/backend)
├── .gitignore               # Git ignore file
├── README.md                # Project documentation
├── package.json             # Root package.json for project-wide scripts and dependencies
├── frontend/                # React frontend application
│   ├── public/              # Static files
│   ├── src/                 # Frontend source code
│   │   ├── assets/          # Images, fonts, etc.
│   │   ├── components/      # Reusable React components
│   │   ├── contexts/        # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components for routing
│   │   ├── services/        # API service layer to communicate with backend
│   │   ├── utils/           # Utility functions
│   │   ├── App.js           # Main App component
│   │   ├── index.js         # Entry point
│   │   └── config.js        # Frontend configuration (pulls from env vars)
│   ├── .env.development     # Frontend-specific dev environment variables
│   ├── .env.production      # Frontend-specific prod environment variables
│   └── package.json         # Frontend dependencies
├── backend/                 # API server
│   ├── src/                 # Backend source code
│   │   ├── config/          # Configuration files
│   │   │   └── db.js        # Database connection setup
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Express middlewares
│   │   ├── models/          # Data models
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic and data access
│   │   ├── utils/           # Utility functions
│   │   └── app.js           # Express app setup
│   ├── .env                 # Backend-specific environment variables
│   └── package.json         # Backend dependencies
└── docker/                  # Docker configuration (if needed)
    ├── frontend/            # Frontend Docker configuration
    ├── backend/             # Backend Docker configuration
    └── docker-compose.yml   # Docker Compose file for local development
```

## Implemented Features

### Landing Page
- Created a modern, responsive landing page that introduces the fitness center
- Implemented membership type selection with detailed information about each option
- Added testimonials and facility highlights to engage potential members

### Membership Types
- Implemented different membership types with specific rules and UI adaptations:
  - **Junior Membership (under 18)**: Requires legal guardian information
  - **Student/Young Professional (18-29)**: Individual membership with restricted family additions
  - **Standard Adult**: Full access with family member additions
  - **Senior**: Full access with family member additions

### Enrollment Form
- Developed a comprehensive enrollment form with the following features:
  - Dynamic form fields that adapt based on membership type
  - Validation for all required fields with helpful error messages
  - Address information with state selection
  - Phone number formatting and validation
  - Special handling for Junior memberships with guardian information
  - Family member addition for eligible membership types

### UI/UX Improvements
- Implemented a shopping cart sidebar that displays selected membership and services
- Added real-time cost calculation based on selections
- Created a responsive design that works on various screen sizes
- Implemented form field highlighting for completed fields
- Added clear section separators and instructions

### Context Management
- Created context providers for:
  - Club selection
  - Membership type management
  - Form data persistence

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Informix database access
- IBM DB2/Informix client libraries (for ibm_db)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd Online_Enrollment
   ```

2. Install dependencies:
   ```
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in the root directory
   - Update the values according to your environment

### Development

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Access the application at `http://localhost:5000`

## Future Enhancements

- Payment processing integration
- Email confirmation system
- Admin dashboard for enrollment management
- Member portal for existing members
- Integration with fitness tracking systems

## Technologies

- **Frontend**: React, React Router, Context API, CSS3
- **Backend**: Node.js, Express, IBM DB2/Informix drivers (ibm_db)
- **Authentication**: JWT
- **Deployment**: Docker

## License

[Your License Here]

## Contact

Mark Moore
Senior Engineer
Wellbridge

## Contract PDF Flow and Troubleshooting

This section documents the end-to-end flow for contract PDF generation, saving, copying to network shares, emailing, and adding the entry to the needs list, along with quick diagnostics and recovery steps.

### End-to-End Flow (Current, Working)

- Contract build and handoff
  - `frontend/src/components/ContractPage.jsx`
    - User reviews and signs the contract.
    - Captures and passes forward: `formData`, `signatureData`, `initialedSections`, `selectedClub` via React Router `location.state`.

- Payment processing
  - `frontend/src/components/ConvergePaymentPage.jsx`
    - Persists `formData`, `signatureData`, `initialedSections` to `sessionStorage` on mount to prevent loss during the hosted modal flow.
    - On approved payment (or Test Mode), posts to backend `POST /api/enrollment` with enrollment and payment info.
    - Navigates to `/enrollment-confirmation` with:
      - `formData`, `signatureData`, `initialedSections`, `selectedClub`
      - `membershipNumber` (`custCode` from backend)
      - `transactionId`, `amountBilled`
  - `frontend/src/components/FluidPayPaymentPage.jsx`
    - Same handoff pattern as Converge.

- Final PDF creation and distribution
  - `frontend/src/components/EnrollmentConfirmation.jsx`
    - Determines which generator to use:
      - New Mexico: `frontend/src/components/CanvasContractPDF.jsx` → `export const generatePDFBuffer`
      - Denver: `frontend/src/components/CanvasContractDenverPDF.jsx` → `export const generatePDFBuffer`
    - Generates PDF using the REAL `membershipNumber` and the signed `signatureData` and `initialedSections`.
    - Saves to backend via `POST /api/save-contract-pdf` with raw `Uint8Array` body and headers:
      - `Content-Type: application/pdf`
      - `X-Contract-Id`: `membershipNumber`
      - `X-Member-Id`: `First_Last`
      - `X-Club-Id`: club id (used for club-specific UNC copy)
    - Generates another PDF for email attachment (Array.from(Uint8Array)) and calls `POST /api/enrollment/send-welcome-email`.
    - Renders the download button using the same canvas component.

- Backend save and copy
  - `backend/src/app.js`
    - Endpoint `POST /api/save-contract-pdf` writes to `backend/src/contracts` as:
      - `MM-DD-YYYY <custCode> <First> <Last> ONLINE.pdf`
    - Duplicate prevention: if a same-named file exists with identical size, skip re-write and skip UNC copies.
    - Copies the already-saved local file (no regeneration) to two UNC targets:
      - `\\vwbwebprod\Electronic Agreements\ContractPDF`
      - `\\vwbwebsvc\c$\Data\ElectronicContracts\Contract\<clubId>`
    - Copy is retried up to 3 times with a 500ms delay; logs success or warnings.

- Enrollment and needs list
  - `backend/src/controllers/enrollmentController.js` (function `submitEnrollment`)
    - Inserts membership, members, contract, and receipt docs.
    - Calls `web_proc_InsertProduction`.
    - Calls `web_proc_AddNeedsList` with only `custCode` (non-blocking try/catch).

### Common Failure Modes and Fast Fixes

- 1‑page or incomplete PDFs (usually NM)
  - Cause: Using `utils/contractPDFGenerator.js` instead of the NM canvas generator.
  - Fix: Ensure `EnrollmentConfirmation.jsx` imports:
    - `generatePDFBuffer as generatePDFBufferNM` from `./CanvasContractPDF`
    - `generatePDFBuffer as generatePDFBufferDenver` from `./CanvasContractDenverPDF`
  - Ensure PDFs are generated on `EnrollmentConfirmation`, not inside payment pages.

- Missing membership number in PDF
  - Cause: Generating the PDF before backend returns the real `custCode`.
  - Fix: Generate PDFs in `EnrollmentConfirmation.jsx` (after `/api/enrollment`), and pass `membershipId: membershipNumber` into the contract formData.

- Corrupted/1‑page attachment when emailing
  - Cause: Sending `ArrayBuffer` directly in JSON.
  - Fix: Convert to `Array.from(new Uint8Array(pdfBuffer))` for JSON payloads. For backend save, send raw `Uint8Array` body with `Content-Type: application/pdf`.

- State loss after hosted payment modal
  - Cause: React state reset during modal flow.
  - Fix: `ConvergePaymentPage.jsx` persists to `sessionStorage` and rehydrates before finishing; ensure this code remains intact.

- Duplicates on UNC shares
  - Cause: Re-saves or re-copies of an identical file.
  - Fix: Backend now checks destination size and skips if identical; confirm filenames are consistent and that old files aren’t being re-used under the same name across days.

- Needs list entry missing
  - Cause: Procedure not called or signature mismatch.
  - Fix: Backend calls `web_proc_AddNeedsList` with only `custCode`. Check logs for `web_proc_AddNeedsList executed` or warning.

### How to Verify and Recover Quickly

- Frontend sanity
  - `EnrollmentConfirmation.jsx` imports correct generators; PDFs generated there with real `membershipNumber`.
  - Save: raw `Uint8Array` to `/api/save-contract-pdf` with headers (`X-Contract-Id`, `X-Member-Id`, `X-Club-Id`).
  - Email: Array payload in JSON.

- Backend sanity
  - `app.js` logs: `PDF contract saved`, and `PDF copied to ...` or `already present ... skipping`.
  - `enrollmentController.js` logs: Production migration and `web_proc_AddNeedsList executed`.

### Test Mode (No Real Charges)

- Enabled only when requested; off by default.
- Enable temporarily in browser console:
  - `localStorage.setItem('TEST_MODE','true')` then refresh.
- A “Bypass Payment (Test Mode)” button appears on `ConvergePaymentPage` and feeds a mock approved payment into the finish flow.
- Disable: `localStorage.removeItem('TEST_MODE')` then refresh.