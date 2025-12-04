# Ella Rises Website

## Project Overview

Ella Rises is a web application for managing STEAM programs, cultural heritage programs, and participant data. The system supports role-based access control with three user types: Administrators (managers), Volunteers, and Participants. Administrators can manage events, participants, surveys, milestones, and donations. Participants can register for events, complete surveys, and view their personal information.

## Website URL

**Production Site:** https://ellarising4-4.is404.net/

### Admin Login

**Email:** admin@hotmail.com
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

**Email:** elizabeth.harris7@learners.net 
**Password:** 12345678

**Participant Features:**
- View available events
- One-click event registration
- Complete post-event surveys
- View personal milestones
- View completed surveys
- Cannot access admin features

### Volunteer Login

**Email:** elijah.hill13@ellarises.org  
**Password:** 123456

**Volunteer Features:**
- Says particpants at the top because they are still a participan the admin can just make them a volunteer
- Same view as participants
- Can view events and register
- Cannot access admin features

 ### Creating Passwords
 **Email:**  penelope.ramirez1104@studentmail.org
 - Login with this email it will prompt you to create 8 charcters
 - Login with that password and you will prompted to the dashbboard

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

