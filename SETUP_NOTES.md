# Setup Notes for Ella Rises Project

## Current Status

✅ **Completed:**
- Project structure and folder organization
- All page views (public, manager, common user)
- Route structure with authentication middleware
- Layout EJS with Ella Rises styling
- Search functionality on all list pages
- Forms for all CRUD operations
- Dashboard placeholder
- 418 Teapot page (IS 404 requirement)

⏳ **Pending (Waiting for):**
- Database connection and SQL script
- Actual authentication with database
- Database queries implementation
- Tableau dashboard embedding
- AWS deployment (handled by another team member)

## Important Notes

### Authentication
Currently, the login accepts any username/password for testing. The username determines the role:
- Username containing "manager" → Manager role
- Any other username → Common User role

**This will be replaced with actual database authentication when the database is ready.**

### Database Integration
All route files have `// TODO:` comments marking where database queries need to be added. The structure is:
1. Uncomment `const db = require('../db');` in route files
2. Replace placeholder queries with actual database queries
3. Update `db/index.js` with your database configuration

### Images
The layout references `/images/ella-rises-logo.png`. You'll need to:
1. Create `public/images/` directory
2. Add the Ella Rises logo image
3. Or update the header.ejs to remove the image reference if not available

### Environment Variables
Create a `.env` file from `.env.example`:
- `PORT`: Server port (default: 3000)
- `SESSION_SECRET`: Random string for session encryption
- Database variables (add when database is ready)

## Testing the Application

1. Install dependencies: `npm install`
2. Start server: `npm start` or `npm run dev`
3. Visit: `http://localhost:3000`
4. Test login with any username/password
5. Navigate through pages to see the structure

## Next Steps When Database is Ready

1. Update `db/index.js` with database connection
2. Uncomment database queries in all route files
3. Update authentication in `routes/auth.js` to query database
4. Test all CRUD operations
5. Add validation and error handling
6. Embed Tableau dashboard in `views/dashboard/index.ejs`

## File Locations for Common Tasks

- **Add new page**: Create view in appropriate folder (`views/public/`, `views/manager/`, or `views/user/`)
- **Add new route**: Create file in `routes/` and add to `server.js`
- **Modify styling**: Edit `public/css/style.css`
- **Change navigation**: Edit `views/partials/header.ejs`
- **Update authentication logic**: Edit `middleware/auth.js` and `routes/auth.js`


