/**
 * Authentication Middleware
 * 
 * These middleware functions protect routes by checking user authentication
 * and authorization. They're used throughout the application to control access.
 */

/**
 * requireAuth - Ensures user is logged in before accessing a route
 * 
 * If user is authenticated, continues to the next middleware/route handler.
 * If not authenticated, saves the requested URL and redirects to login page
 * so the user can be redirected back after logging in.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        // User is authenticated - attach user to request object for convenience
        req.user = req.session.user;
        next();
    } else {
        // User is not authenticated - save where they wanted to go
        // After login, they'll be redirected back to this URL
        req.session.returnTo = req.originalUrl;
        res.redirect('/login');
    }
}

/**
 * requireManager - Ensures user has manager role
 * 
 * This should be used AFTER requireAuth to ensure the user is logged in first.
 * Only managers can access routes protected by this middleware.
 * Regular users get a 403 Forbidden error.
 */
function requireManager(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'manager') {
        // User is a manager - allow access
        req.user = req.session.user;
        next();
    } else {
        // User is not a manager - show access denied page
        // This prevents regular users from accessing manager-only features
        res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You do not have permission to access this page. Manager access required.',
            user: req.session.user || null
        });
    }
}

module.exports = {
    requireAuth,
    requireManager
};

