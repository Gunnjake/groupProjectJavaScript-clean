// setup express server

const express = require('express');
const session = require('express-session');
const path = require('path');

// load env vars
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 8080;

// parse request data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// serve static files
app.use(express.static(path.join(__dirname, 'public')));

// session config
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

// use ejs templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// clear flash messages
const clearMessagesAfterRender = require('./middleware/clearMessages');
app.use(clearMessagesAfterRender);

// load routes
const routes = require('./routes');
app.use('/', routes);

// catch errors
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

// test database connection
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
        
        // fix sequences
        const { fixAllSequences } = require('./utils/fixSequences');
        await fixAllSequences(knexInstance);
    } catch (error) {
        console.log('⚠ Database connection failed. Server will continue without database.');
        console.log(`  Error: ${error.message}`);
    }
}

// start server
app.listen(PORT, () => {
    console.log(`✓ Ella Rises server running on port ${PORT}`);
    console.log(`✓ View the application at: http://localhost:${PORT}`);
    // test database
    testDatabaseConnection();
});

