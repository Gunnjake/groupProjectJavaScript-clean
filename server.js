// Main server file - sets up Express app and middleware

const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

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

// Start listening
app.listen(PORT, () => {
  console.log(`Ella Rises server running on http://localhost:${PORT}`);
});

