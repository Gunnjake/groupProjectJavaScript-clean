# Ella Rises Website

## Project Overview

Ella Rises is a web application for managing STEAM programs, cultural heritage programs, and participant data. The system supports role-based access control with three user types: Administrators (managers), Volunteers, and Participants. Administrators can manage events, participants, surveys, milestones, and donations. Participants can register for events, complete surveys, and view their personal information.

## Website URL

**Production Site:** https://ellarising4-4.is404.net/

## TA Grading Instructions

### Admin Login

**Email:** admin@ella.com  
**Password:** admin

**Admin Features:**
- Full dashboard with analytics (Tableau embedded)
- Manage events (create, edit, delete future events)
- Manage participants (CRUD operations)
- View and delete completed surveys
- Manage milestones (create, edit, delete)
- Manage donations (CRUD operations)
- User maintenance (add/remove admin and volunteer roles)
- All data tables with search functionality

### User Login (Participant)

**Email:** user@ella.com  
**Password:** user

**Participant Features:**
- View available events
- One-click event registration
- Complete post-event surveys
- View personal milestones
- View completed surveys
- No dashboard (redirects to events page)
- Cannot access admin features

### Volunteer Login

**Email:** volunteer@ella.com  
**Password:** volunteer

**Volunteer Features:**
- Same view as participants
- Can view events and register
- Cannot access admin features

### TA Features Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Login works for admin | ✓ | Email-first flow, password check |
| Login works for user | ✓ | Email-first flow, password creation |
| Login works for volunteer | ✓ | Same as participant |
| Role restrictions work | ✓ | Admin sees dashboard, participants redirected |
| Event registration works | ✓ | One-click registration, capacity check |
| Surveys can be filled | ✓ | Post-event survey submission |
| Surveys can be viewed | ✓ | Admin sees all, participants see own |
| Milestones work | ✓ | Admin can create/edit/delete |
| Donations work | ✓ | Admin CRUD operations |
| Admin CRUD pages work | ✓ | All manager pages functional |
| Required fields enforced | ✓ | Frontend and backend validation |
| Date formats fixed | ✓ | Consistent date handling |

## Local Development Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd INTEX-ELLA-RISES
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
NODE_ENV=development
PORT=8080
SESSION_SECRET=your-secret-key-here

RDS_HOSTNAME=your-database-host
RDS_DB_NAME=your-database-name
RDS_USERNAME=your-database-username
RDS_PASSWORD=your-database-password
RDS_PORT=5432
```

4. Connect to PostgreSQL:
- Ensure PostgreSQL is running
- Update `.env` with your database credentials
- Database schema should match the ERD provided

5. Run the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

6. Access the application:
Open http://localhost:8080 in your browser

### Rebuilding Assets

No build step required. Static assets in `/public` are served directly.

## Deployment Notes

### AWS Elastic Beanstalk

The application is deployed to AWS Elastic Beanstalk and automatically deploys from the `main` branch.

**Environment Variables Required:**
- `NODE_ENV=production`
- `PORT=8080` (set by Beanstalk)
- `SESSION_SECRET` (set in Beanstalk configuration)
- `RDS_HOSTNAME` (from RDS instance)
- `RDS_DB_NAME` (database name)
- `RDS_USERNAME` (database username)
- `RDS_PASSWORD` (database password)
- `RDS_PORT=5432`

**Database Requirements:**
- PostgreSQL RDS instance
- Database schema matches ERD
- Tables: people, peopleroles, roles, admindetails, volunteerdetails, participantdetails, eventoccurrences, eventtemplate, eventregistrations, surveys, milestones, donations

**Deployment Process:**
1. Push changes to `main` branch
2. Beanstalk automatically deploys
3. Server restarts with new code
4. Database connection tested on startup

## Project Structure

```
INTEX-ELLA-RISES/
├── server.js              # Main Express server
├── routes/
│   └── index.js           # All application routes
├── middleware/
│   ├── auth.js           # Authentication middleware
│   └── clearMessages.js  # Flash message cleanup
├── views/                # EJS templates
│   ├── auth/             # Login pages
│   ├── manager/          # Admin pages
│   ├── user/             # Participant pages
│   ├── public/           # Public pages
│   └── partials/        # Header/footer
├── public/               # Static assets
│   ├── css/
│   ├── js/
│   └── images/
└── utils/                # Utility functions
```

## Key Features

### Authentication System
- Email-first login flow
- Password creation for new users
- Role-based access control
- Session management

### Event Management
- Create/edit/delete events
- Event capacity tracking
- One-click participant registration
- Past/future event filtering

### Survey System
- Post-event survey creation
- Participant survey completion
- Admin survey viewing/deletion
- Survey score tracking

### Participant Management
- Full CRUD operations
- Milestone assignment
- Registration tracking
- Profile management

### Donation Management
- Donation entry and editing
- Donor management (existing or new)
- Date tracking
- Admin reporting

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Knex.js
- **Templates:** EJS
- **Authentication:** Express-session, bcryptjs
- **Deployment:** AWS Elastic Beanstalk

## Support

For issues or questions, contact the development team.
