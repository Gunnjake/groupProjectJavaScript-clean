// Main server file - sets up Express app and middleware

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Always load .env from project root, not routing folders
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// Log .env loading status
if (fs.existsSync(envPath)) {
    console.log(`✓ Loaded .env from: ${path.resolve(envPath)}`);
} else {
    console.error(`✗ .env file not found at: ${path.resolve(envPath)}`);
    throw new Error('Missing .env file in project root');
}

// Log actual .env values for verification
console.log('RDS_HOSTNAME:', process.env.RDS_HOSTNAME || 'NOT SET');
console.log('RDS_USERNAME:', process.env.RDS_USERNAME || 'NOT SET');
console.log('RDS_DB_NAME:', process.env.RDS_DB_NAME || 'NOT SET');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Test database connection before starting server
async function startServer() {
    try {
        // Check environment variables - throw error if any are missing
        const requiredVars = ['RDS_HOSTNAME', 'RDS_DB_NAME', 'RDS_USERNAME', 'RDS_PASSWORD'];
        const missingVars = requiredVars.filter(v => !process.env[v]);
        
        if (missingVars.length > 0) {
            console.error('✗ Missing required environment variables:');
            missingVars.forEach(v => console.error(`  - ${v}`));
            throw new Error('Missing required environment variables');
        }
        
        // Verify values aren't template placeholders
        if (process.env.RDS_USERNAME && process.env.RDS_USERNAME.includes('your-rds')) {
            throw new Error('RDS_USERNAME contains template value. Please set actual username in .env');
        }
        if (process.env.RDS_HOSTNAME && process.env.RDS_HOSTNAME.includes('xxxxx')) {
            throw new Error('RDS_HOSTNAME contains template value. Please set actual RDS endpoint in .env');
        }
        
        console.log('✓ All required environment variables found');
        
        const db = require('./db');
        
        // Get connection info before testing - read directly from env vars
        console.log('\nAttempting database connection...');
        console.log(`  Host: ${process.env.RDS_HOSTNAME}`);
        console.log(`  Database: ${process.env.RDS_DB_NAME}`);
        console.log(`  User: ${process.env.RDS_USERNAME}`);
        console.log(`  Port: ${process.env.RDS_PORT || '5432'}`);
        console.log(`  SSL: Enabled`);
        
        // Test database connection with timeout
        const connectionPromise = db.raw('SELECT 1');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        
        console.log('\n✓ Database connected successfully!');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`\n✓ Ella Rises server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('\n✗ Database connection failed!');
        console.error(`  Error: ${error.message}`);
        if (error.code) {
            console.error(`  Code: ${error.code}`);
        }
        if (error.address) {
            console.error(`  Address: ${error.address}`);
        }
        if (error.port) {
            console.error(`  Port: ${error.port}`);
        }
        console.log('\n⚠ Starting server without database connection...');
        console.log('  Some features may not work until database is configured.');
        console.log('  Troubleshooting tips:');
        console.log('    - Verify RDS instance is running and accessible');
        console.log('    - Check security group allows connections from your IP');
        console.log('    - Verify credentials are correct');
        console.log('    - Check RDS endpoint URL is correct\n');
        
        // Start server anyway (for development/testing)
        app.listen(PORT, () => {
            console.log(`✓ Ella Rises server running on http://localhost:${PORT}`);
        });
    }
}

startServer();

