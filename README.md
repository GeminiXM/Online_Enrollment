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