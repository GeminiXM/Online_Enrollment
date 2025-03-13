# Online Enrollment System

A web application for managing online enrollment processes, built with React frontend and Node.js backend connecting to Informix databases.

## Project Structure

This project is organized as a monorepo containing both frontend and backend code:

- `frontend/`: React application for the user interface
- `backend/`: Node.js API server connecting to Informix databases
- `docker/`: Docker configuration for development and deployment

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

## Features

- User authentication and authorization
- Enrollment form submission and processing
- Admin dashboard for enrollment management
- Integration with Informix databases

## Technologies

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express, IBM DB2/Informix drivers (ibm_db)
- **Authentication**: JWT
- **Deployment**: Docker

## License

[Your License Here]

## Contact

[Your Contact Information] 