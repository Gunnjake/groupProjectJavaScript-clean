// Main server file - sets up Express app and middleware

const express = require('express');
const session = require('express-session');
const path = require('path');

// Load .env ONLY in development (production uses Elastic Beanstalk environment variables)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 8080;

// Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Session config - stores user login state
app.use(session({
  secret: process.env.SESSION_SECRET || 'ella-rises-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Use EJS for templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load all routes
const routes = require('./routes');
app.use('/', routes);

// Catch errors and show error page
app.use((err, req, res, next) => {
    console.error('Error:', err);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(err.status || 500);
    res.render('error', {
        title: 'Error - Ella Rises',
        message: isDevelopment ? err.message : 'An error occurred. Please try again later.',
        user: req.session ? req.session.user : null
    });
});

// Test database connection asynchronously (non-blocking)
async function testDatabaseConnection() {
    try {
        const requiredVars = ['RDS_HOSTNAME', 'RDS_DB_NAME', 'RDS_USERNAME', 'RDS_PASSWORD'];
        const missingVars = requiredVars.filter(v => !process.env[v]);
        
        if (missingVars.length > 0) {
            console.log('⚠ Database environment variables not set. Database features will be unavailable.');
            return;
        }
        
        const knex = require('knex');
        const knexConfig = require('./knexfile');
        const environment = process.env.NODE_ENV || 'development';
        const knexInstance = knex(knexConfig[environment]);
        const connectionPromise = knexInstance.raw('SELECT 1');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        console.log('✓ Database connected successfully');
    } catch (error) {
        console.log('⚠ Database connection failed. Server will continue without database.');
        console.log(`  Error: ${error.message}`);
    }
}

// Start server immediately (non-blocking)
app.listen(PORT, () => {
    console.log(`✓ Ella Rises server running on port ${PORT}`);
    // Test database connection in background (non-blocking)
    testDatabaseConnection();
});

