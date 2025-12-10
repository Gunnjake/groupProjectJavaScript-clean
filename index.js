/**
 * ============================================================================
 * HUUS CLEANING SERVICE - MAIN SERVER FILE
 * ============================================================================
 * 
 * This is the main Express.js server application for the Huus Cleaning booking system.
 * It handles:
 * - Customer booking flow (multi-step form)
 * - Admin dashboard with appointment management
 * - Admin service management (cleaning types, extras, dates/times)
 * - Admin testimonials management
 * - Authentication and session management
 * - Database connections (PostgreSQL)
 * 
 * FILE STRUCTURE:
 * - Lines 1-120:   Setup (dependencies, DB connection, middleware)
 * - Lines 124-289: Public routes (homepage, about, services, booking start)
 * - Lines 291-380: Authentication (login, logout, middleware)
 * - Lines 382-832: Admin routes (dashboard, appointments, analytics, dates/times)
 * - Lines 834-927: Admin services management
 * - Lines 930-978: Public services page
 * - Lines 979-1633: Booking flow routes (multi-step)
 * - Lines 1634-2111: Admin CRUD operations (dates, testimonials, etc.)
 * - Lines 2113-2120: Server startup
 * 
 * ROUTES SUMMARY:
 * - Public: /, /aboutUs, /services, /cleaningType, /extra, /frequency, /yourdetails, /review, /payment, /summary
 * - Admin: /admin, /admin/completed, /admin/analytics, /admin/services, /admin/dates-times, /admin/testimonials
 * - API: /api/available-dates, /api/time-slots/:dateId
 * - Auth: /login, /logout
 * 
 * Last updated: 2025-11-22
 * ============================================================================
 */

// =======================
// ENVIRONMENT SETUP
// =======================
if (process.env.NODE_ENV !== "production") {
  const result = require("dotenv").config();
  if (result.error) {
    console.error("Error loading .env file:", result.error);
  } else {
    console.log(".env file loaded successfully");
  }
} else {
  console.log("Running in production — using Elastic Beanstalk environment variables.");
}

// =======================
// CORE DEPENDENCIES
// =======================
const express = require("express");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const { Pool } = require("pg");

const app = express();

// =======================
// DATABASE CONFIG (AWS RDS)
// =======================
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: { rejectUnauthorized: false }   // Required for AWS RDS
};

// =======================
// CREATE POOL
// =======================
const pool = new Pool(dbConfig);

// Handle idle client errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

// =======================
// TEST CONNECTION ON START
// =======================
(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✓ Connected to PostgreSQL (RDS) at:", result.rows[0].now);
  } catch (err) {
    console.error("✗ Failed to connect to PostgreSQL (RDS)");
    console.error("Error:", err.message);
  }
})();

module.exports = { pool };


// =======================
// EXPRESS APP CONFIGURATION
// =======================
// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-ejs-layouts for consistent page layouts
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Parse URL-encoded request bodies (for forms)
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (CSS, images, JS)
app.use(express.static(path.join(__dirname, 'public')));

// =======================
// SESSION CONFIGURATION
// =======================
// Configure express-session for user authentication and booking flow state
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: true,
  // Session data persists user login state and multi-step booking form data
}));

// Make session data available to all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// =======================
// PUBLIC ROUTES
// =======================
// These routes are accessible to all users (no authentication required)

// ===========================================
// HOME PAGE
// ===========================================
// Route: GET /
// Purpose: Display homepage with services, booking form, and testimonials
// Data: Fetches services, cleaning types, bedroom options, and testimonials from database
app.get('/', async (req, res) => {
  try {
    // Fetch services from database
    const servicesResult = await pool.query(
      'SELECT service_name, description FROM service_offerings WHERE is_active = true ORDER BY service_id'
    );
    
    const services = servicesResult.rows.map(row => ({
      title: row.service_name,
      bullets: row.description 
        ? row.description.split(',').map(b => b.trim()).filter(b => b.length > 0)
        : ['Professional cleaning service']
    }));
    
    // Fetch cleaning types for the booking form
    const cleaningTypesResult = await pool.query(
      'SELECT name FROM cleaning_types ORDER BY cleaning_type_id'
    );
    
    const cleaningTypes = cleaningTypesResult.rows.map(row => row.name);
    
    // Fetch bedroom options for the booking form
    const bedroomOptionsResult = await pool.query(
      'SELECT bedroom_count, label FROM bedroom_options ORDER BY display_order'
    );
    
    const bedroomOptions = bedroomOptionsResult.rows.map(row => ({
      value: String(row.bedroom_count),
      label: row.label
    }));
    
    // Fetch testimonials from database
    let testimonials = [];
    try {
      const testimonialsResult = await pool.query(
        'SELECT name, quote FROM testimonials WHERE is_active = TRUE ORDER BY display_order, testimonial_id'
      );
      testimonials = testimonialsResult.rows.length > 0 
        ? testimonialsResult.rows
        : [
            { name: 'Michelle', quote: 'Process was straightforward and reliable.' },
            { name: 'Brandon', quote: 'Great service and communication.' }
          ];
    } catch (error) {
      console.error('Error fetching testimonials for homepage:', error);
      testimonials = [
    { name: 'Michelle', quote: 'Process was straightforward and reliable.' },
    { name: 'Brandon', quote: 'Great service and communication.' }
  ];
    }
    
    res.render('index', { 
      services: services.length > 0 ? services : [
        { title: 'Residential Cleaning', bullets: ['Transparent pricing', 'Top local cleaners'] },
        { title: 'Vacation Rental', bullets: ['Calendar sync', 'Host reports'] },
      ],
      cleaningTypes,
      bedroomOptions,
      testimonials,
      // Pre-fill values from session if available
      prefill: {
        zip: req.session.homepageData?.zip || '',
        bedrooms: req.session.homepageData?.bedrooms || '',
        cleaningType: req.session.homepageData?.cleaningType || '',
        phone: req.session.homepageData?.phone || '',
        email: req.session.homepageData?.email || ''
      }
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    // Fallback to hardcoded data
    res.render('index', {
      services: [
        { title: 'Residential Cleaning', bullets: ['Transparent pricing', 'Top local cleaners'] },
        { title: 'Vacation Rental', bullets: ['Calendar sync', 'Host reports'] },
      ],
      cleaningTypes: ['Residential Cleaning', 'Vacation Rental'],
      bedroomOptions: [
        { value: '1', label: '1 Bedroom' },
        { value: '2', label: '2 Bedrooms' },
        { value: '3', label: '3 Bedrooms' },
        { value: '4', label: '4 Bedrooms' }
      ],
      testimonials: [
    { name: 'Michelle', quote: 'Process was straightforward and reliable.' },
        { name: 'Brandon', quote: 'Great service and communication.' }
      ],
      prefill: {}
    });
  }
});

// Homepage booking form submission
app.post('/book', async (req, res) => {
  try {
    const { zip, bedrooms, cleaningType, phone, email } = req.body;
    
    // Store homepage form data in session
    req.session.homepageData = {
      zip,
      bedrooms,
      cleaningType,
      phone,
      email
    };
    
    // Pre-fill step1 data for booking flow
    req.session.step1 = {
      bedrooms: bedrooms,
      cleaningType: cleaningType
    };
    req.session.step = 0; // Will be set to 1 after cleaningType page
    
    // Redirect to booking flow
    res.redirect('/cleaningType');
  } catch (error) {
    console.error('Error processing homepage booking form:', error);
    req.session.message = 'There was an error. Please try again.';
    res.redirect('/');
  }
});

// ===========================================
// ABOUT US PAGE
// ===========================================
// Route: GET /aboutUs
// Purpose: Display about us page with testimonials from database
// Data: Fetches active testimonials ordered by display_order
app.get('/aboutUs', async (req, res) => {
  try {
    // Fetch testimonials from database
    const testimonialsResult = await pool.query(
      'SELECT name, quote FROM testimonials WHERE is_active = TRUE ORDER BY display_order, testimonial_id'
    );
    
    const testimonials = testimonialsResult.rows.length > 0 
      ? testimonialsResult.rows
      : [
    { name: 'Michelle', quote: 'Process was straightforward and reliable.' },
    { name: 'Brandon', quote: 'Great service and communication.' },
          { name: 'Sarah', quote: 'Super easy booking and great cleaners!' }
  ];
    
  res.render('aboutUs', { testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    // Fallback to hardcoded testimonials
    res.render('aboutUs', {
      testimonials: [
        { name: 'Michelle', quote: 'Process was straightforward and reliable.' },
        { name: 'Brandon', quote: 'Great service and communication.' },
        { name: 'Sarah', quote: 'Super easy booking and great cleaners!' }
      ]
    });
  }
});

// ===============================
// AUTHENTICATION & MIDDLEWARE
// ===============================

// Import bcrypt for password hashing
const bcrypt = require('bcrypt');

// ===========================================
// AUTHENTICATION MIDDLEWARE
// ===========================================
// Middleware to protect admin routes - checks if admin is logged in
// Redirects to /login if not authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.admin_id) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

// ===============================
// AUTHENTICATION ROUTES
// ===============================

// ===========================================
// LOGIN PAGE
// ===========================================
// Route: GET /login
// Purpose: Display admin login page
// Redirects: If already logged in, redirects to /admin
app.get('/login', (req, res) => {
  // If already logged in, redirect to admin
  if (req.session && req.session.admin_id) {
    return res.redirect('/admin');
  }
  res.render('login', { error: req.session.loginError });
  req.session.loginError = null; // Clear error after showing
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      req.session.loginError = 'Please enter both username and password';
      return res.redirect('/login');
    }
    
    // Check if admin exists in database
    const adminResult = await pool.query(
      'SELECT admin_id, username, password_hash, email FROM admins WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (adminResult.rows.length === 0) {
      req.session.loginError = 'Invalid username or password';
      return res.redirect('/login');
    }
    
    const admin = adminResult.rows[0];
    
    // Check password (support both hashed and plain text for initial setup)
    let passwordMatch = false;
    
    if (admin.password_hash && admin.password_hash.startsWith('$2')) {
      // Bcrypt hash
      passwordMatch = await bcrypt.compare(password, admin.password_hash);
    } else {
      // Plain text (for initial setup - user will add proper hash later)
      passwordMatch = password === admin.password_hash;
    }
    
    if (!passwordMatch) {
      req.session.loginError = 'Invalid username or password';
      return res.redirect('/login');
    }
    
    // Set session
    req.session.admin_id = admin.admin_id;
    req.session.admin_username = admin.username;
    req.session.admin_email = admin.email;
    
    // Redirect to admin or returnTo URL
    const returnTo = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    res.redirect(returnTo);
    
  } catch (error) {
    console.error('Login error:', error);
    req.session.loginError = 'An error occurred. Please try again.';
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/'); // Redirect to homepage instead of login
  });
});

// ===============================
// ADMIN ROUTES (PROTECTED)
// ===============================

// ACTIVE APPOINTMENTS
app.get('/admin', requireAuth, async (req, res) => {
  try {
    const error = req.query.error || null;
    const success = req.query.success || null;
    
    // Fetch active bookings from database with payment status
    const activeBookings = await pool.query(
      `SELECT 
        b.booking_id,
        b.requested_date,
        b.requested_time,
        b.status,
        b.total_due,
        b.comments,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        p.address_line1,
        p.address_line2,
        p.city,
        p.state,
        p.zipcode,
        p.bedrooms,
        ct.name as cleaning_type,
        f.name as frequency,
        CASE 
          WHEN pay.payment_id IS NOT NULL AND pay.status = 'paid' THEN 'paid'
          WHEN b.status = 'unpaid' THEN 'unpaid'
          ELSE 'pending'
        END as payment_status
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN properties p ON b.property_id = p.property_id
      JOIN cleaning_types ct ON b.cleaning_type_id = ct.cleaning_type_id
      JOIN frequency f ON b.frequency_id = f.frequency_id
      LEFT JOIN payments pay ON b.booking_id = pay.booking_id
      WHERE b.status != 'completed' OR b.status IS NULL
      ORDER BY b.requested_date ASC, b.requested_time ASC`
    );
    
    // Fetch extras for each booking
    const bookingsWithExtras = await Promise.all(
      activeBookings.rows.map(async (booking) => {
        const extrasResult = await pool.query(
          `SELECT aos.name, aos.price
           FROM booking_add_ons bao
           JOIN add_on_services aos ON bao.add_on_id = aos.add_on_id
           WHERE bao.booking_id = $1`,
          [booking.booking_id]
        );
        return {
          ...booking,
          comments: booking.comments || null, // Ensure comments is always defined
          extras: extrasResult.rows
        };
      })
    );
    
    // Get completed bookings count for analytics
    const completedResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'"
    );
    const completedCount = parseInt(completedResult.rows[0].count) || 0;
    
    // Get total customers count for analytics
    const totalCustomersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count) || 0;
    
  res.render('adminDashboard', {
    section: 'active',
      activeAppointments: bookingsWithExtras,
      completedAppointments: [],
      analytics: { 
        totalCustomers: totalCustomers,
        totalAppointments: bookingsWithExtras.length + completedCount 
      },
      services: [],
      testimonials: [],
      datesWithTimes: [],
      error: error,
      success: success
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.render('adminDashboard', {
      section: 'active',
      activeAppointments: [],
      completedAppointments: [],
      analytics: { 
        totalCustomers: 0,
        totalAppointments: 0 
      },
      services: [],
      testimonials: [],
      datesWithTimes: [],
      error: 'Error loading bookings'
    });
  }
});

// COMPLETED
app.get('/admin/completed', requireAuth, async (req, res) => {
  try {
    const error = req.query.error || null;
    const success = req.query.success || null;
    
    // Fetch completed bookings from database with payment status
    const completedBookings = await pool.query(
      `SELECT 
        b.booking_id,
        b.requested_date,
        b.requested_time,
        b.status,
        b.total_due,
        b.comments,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        p.address_line1,
        p.bedrooms,
        ct.name as cleaning_type,
        f.name as frequency,
        CASE 
          WHEN pay.payment_id IS NOT NULL AND pay.status = 'paid' THEN 'paid'
          WHEN b.status = 'unpaid' THEN 'unpaid'
          ELSE 'pending'
        END as payment_status
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN properties p ON b.property_id = p.property_id
      JOIN cleaning_types ct ON b.cleaning_type_id = ct.cleaning_type_id
      JOIN frequency f ON b.frequency_id = f.frequency_id
      LEFT JOIN payments pay ON b.booking_id = pay.booking_id
      WHERE b.status = 'completed'
      ORDER BY b.requested_date DESC, b.requested_time DESC`
    );
    
    // Fetch extras for each booking
    const bookingsWithExtras = await Promise.all(
      completedBookings.rows.map(async (booking) => {
        const extrasResult = await pool.query(
          `SELECT aos.name, aos.price
           FROM booking_add_ons bao
           JOIN add_on_services aos ON bao.add_on_id = aos.add_on_id
           WHERE bao.booking_id = $1`,
          [booking.booking_id]
        );
        return {
          ...booking,
          comments: booking.comments || null, // Ensure comments is always defined
          extras: extrasResult.rows
        };
      })
    );
    
    // Get active bookings count for analytics
    const activeResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status != 'completed' OR status IS NULL"
    );
    const activeCount = parseInt(activeResult.rows[0].count) || 0;
    
    // Get total customers count for analytics
    const totalCustomersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count) || 0;
    
  res.render('adminDashboard', {
    section: 'completed',
      activeAppointments: [],
      completedAppointments: bookingsWithExtras,
      analytics: { 
        totalCustomers: totalCustomers,
        totalAppointments: bookingsWithExtras.length + activeCount 
      },
      services: [],
      testimonials: [],
      datesWithTimes: [],
      error: error,
      success: success
    });
  } catch (error) {
    console.error('Error loading completed bookings:', error);
    res.render('adminDashboard', {
      section: 'completed',
      activeAppointments: [],
      completedAppointments: [],
      analytics: { 
        totalCustomers: 0,
        totalAppointments: 0 
      },
      services: [],
      testimonials: [],
      datesWithTimes: [],
      error: 'Error loading completed bookings'
    });
  }
});

// ANALYTICS
app.get('/admin/analytics', requireAuth, async (req, res) => {
  try {
    // Total Customers (only customers with at least one completed appointment)
    const totalCustomersQuery = `
      SELECT COUNT(DISTINCT customer_id) AS total_customers
      FROM bookings
      WHERE status = 'completed'
    `;
    const totalCustomersResult = await pool.query(totalCustomersQuery);
    const totalCustomers = totalCustomersResult.rows[0].total_customers || 0;

    // Total Revenue (only paid bookings - join with payments to find paid bookings)
    const totalRevenueQuery = `
      SELECT COALESCE(SUM(b.total_due), 0) AS total_revenue
      FROM bookings b
      JOIN payments p ON b.booking_id = p.booking_id
      WHERE p.status = 'paid'
    `;
    const totalRevenueResult = await pool.query(totalRevenueQuery);
    const totalRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue) || 0;

    // Total Appointments
    const totalAppointmentsQuery = `
      SELECT COUNT(*) AS total_appointments
      FROM bookings
    `;
    const totalAppointmentsResult = await pool.query(totalAppointmentsQuery);
    const totalAppointments = parseInt(totalAppointmentsResult.rows[0].total_appointments) || 0;

    // Counts by Bedroom (count bookings, join with properties to get bedrooms)
    const bedroomCountsQuery = `
      SELECT p.bedrooms, COUNT(*) AS count
      FROM bookings b
      JOIN properties p ON b.property_id = p.property_id
      WHERE p.bedrooms IS NOT NULL
      GROUP BY p.bedrooms
      ORDER BY p.bedrooms
    `;
    const bedroomCountsResult = await pool.query(bedroomCountsQuery);
    const bedroomCounts = bedroomCountsResult.rows.map(row => ({
      bedrooms: row.bedrooms,
      count: parseInt(row.count)
    }));

    // Extras Popularity (actual add-ons chosen by bookings)
    const extraCountsQuery = `
      SELECT aos.name AS extra, COUNT(*) AS count
      FROM booking_add_ons bao
      JOIN add_on_services aos ON aos.add_on_id = bao.add_on_id
      GROUP BY aos.name
      ORDER BY count DESC
    `;
    const extraCountsResult = await pool.query(extraCountsQuery);
    const extraCounts = extraCountsResult.rows.map(row => ({
      extra: row.extra,
      count: parseInt(row.count)
    }));
    
    const analytics = {
      totalCustomers: totalCustomers,
      totalRevenue: totalRevenue,
      totalAppointments: totalAppointments,
      bedroomCounts: bedroomCounts,
      extraCounts: extraCounts
    };
    
    res.render('adminDashboard', {
      section: 'analytics',
      activeAppointments: [],
      completedAppointments: [],
      analytics: analytics,
      services: [],
      testimonials: [],
      datesWithTimes: [],
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error loading analytics:', error);
    res.render('adminDashboard', {
      section: 'analytics',
      activeAppointments: [],
      completedAppointments: [],
      analytics: {
        totalCustomers: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        bedroomCounts: [],
        extraCounts: []
      },
      services: [],
      testimonials: [],
      datesWithTimes: [],
      error: 'Error loading analytics',
      success: null
    });
  }
});

// MARK BOOKING AS COMPLETED
app.post('/admin/mark-complete/:bookingId', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    
    if (isNaN(bookingId)) {
      return res.redirect('/admin?error=Invalid booking ID');
    }
    
    await pool.query(
      'UPDATE bookings SET status = $1 WHERE booking_id = $2',
      ['completed', bookingId]
    );
    
    res.redirect('/admin?success=Booking marked as completed');
  } catch (error) {
    console.error('Error marking booking as completed:', error);
    res.redirect('/admin?error=Error updating booking status');
  }
});

// UPDATE BOOKING DATE/TIME
app.post('/admin/booking/update-datetime', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.body.booking_id);
    const requested_date = req.body.requested_date;
    const requested_time = req.body.requested_time;
    
    if (!bookingId || isNaN(bookingId)) {
      return res.redirect('/admin?error=Invalid booking ID');
    }
    
    if (!requested_date || !requested_time) {
      return res.redirect('/admin?error=Date and time are required');
    }
    
    await pool.query(
      'UPDATE bookings SET requested_date = $1, requested_time = $2 WHERE booking_id = $3',
      [requested_date, requested_time, bookingId]
    );
    
    console.log(`✓ Booking ${bookingId} date/time updated successfully`);
    res.redirect('/admin?success=Appointment date and time updated successfully');
  } catch (error) {
    console.error('Error updating booking date/time:', error);
    res.redirect('/admin?error=Error updating appointment: ' + error.message);
  }
});

app.post('/admin/booking/delete', requireAuth, async (req, res) => {
  // 1. Add logging at the top
  console.log("DELETE ROUTE CALLED with booking_id:", req.body.booking_id);
  
  let bookingId;
  try {
    bookingId = parseInt(req.body.booking_id);
    const referer = req.get('Referer') || '/admin';
    const section = referer.includes('/completed') ? 'completed' : 'active';

    if (!bookingId || isNaN(bookingId)) {
      return res.redirect(`${referer}?error=Invalid booking ID`);
    }

    // 2. Block duplicate delete attempts
    if (!req.session) req.session = {};
    if (req.session.lastDeletedId === req.body.booking_id) {
      console.log("Duplicate delete prevented for:", req.body.booking_id);
      return res.redirect("/admin?success=Booking already deleted");
    }
    req.session.lastDeletedId = req.body.booking_id;

    // 3. Fix the delete ordering - remove dependent rows first
    await pool.query("DELETE FROM booking_services WHERE booking_id = $1", [bookingId]);
    await pool.query("DELETE FROM booking_status_history WHERE booking_id = $1", [bookingId]);
    await pool.query("DELETE FROM booking_add_ons WHERE booking_id = $1", [bookingId]);
    await pool.query("DELETE FROM payments WHERE booking_id = $1", [bookingId]);
    await pool.query("DELETE FROM bookings WHERE booking_id = $1", [bookingId]);

    console.log(`✓ Booking ${bookingId} fully deleted.`);

    // 5. Clear session workflow after successful delete
    delete req.session.step1;
    delete req.session.step2;
    delete req.session.step3;
    delete req.session.step4;

    // 6. Only one redirect
    const redirectUrl = section === 'completed' ? '/admin/completed' : '/admin';
    res.redirect(`${redirectUrl}?success=Booking deleted successfully`);
  } catch (error) {
    // 4. Add error logging
    console.error("DELETE ERROR:", {
      bookingId,
      message: error.message,
      stack: error.stack
    });
    const referer = req.get('Referer') || '/admin';
    const section = referer.includes('/completed') ? 'completed' : 'active';
    const redirectUrl = section === 'completed' ? '/admin/completed' : '/admin';
    res.redirect(`${redirectUrl}?error=Error deleting booking: ${error.message}`);
  }
});


// TESTIMONIALS PAGE
app.get('/admin/testimonials', requireAuth, async (req, res) => {
  try {
    const error = req.query.error || null;
    const success = req.query.success || null;
    
    const testimonialsResult = await pool.query(
      'SELECT testimonial_id, name, quote, is_active, display_order FROM testimonials ORDER BY display_order, testimonial_id'
    );
    
    // Get active and completed counts for analytics
    const activeResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status != 'completed' OR status IS NULL"
    );
    const completedResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'"
    );
    
    // Get total customers count for analytics
    const totalCustomersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count) || 0;
    
    res.render('adminDashboard', {
      section: 'testimonials',
      testimonials: testimonialsResult.rows,
      activeAppointments: [],
      completedAppointments: [],
      analytics: {
        totalCustomers: totalCustomers,
        totalAppointments: parseInt(activeResult.rows[0].count) + parseInt(completedResult.rows[0].count)
      },
      services: [],
      datesWithTimes: [],
      error: error,
      success: success
    });
  } catch (error) {
    console.error('Error loading testimonials:', error);
    res.render('adminDashboard', {
      section: 'testimonials',
      testimonials: [],
      activeAppointments: [],
      completedAppointments: [],
      analytics: { 
        totalCustomers: 0,
        totalAppointments: 0 
      },
      services: [],
      datesWithTimes: [],
      error: 'Error loading testimonials'
    });
  }
});

// DATES & TIMES PAGE
app.get('/admin/dates-times', requireAuth, async (req, res) => {
  try {
    const error = req.query.error || null;
    const success = req.query.success || null;
    
    // Available Dates with Time Slots
    const datesResult = await pool.query(
      'SELECT date_id, available_date, is_available, max_bookings FROM available_dates ORDER BY available_date ASC'
    );
    
    const datesWithTimes = await Promise.all(
      datesResult.rows.map(async (date) => {
        const timeSlotsResult = await pool.query(
          'SELECT time_slot_id, time_slot, is_available, max_bookings FROM available_time_slots WHERE date_id = $1 ORDER BY time_slot ASC',
          [date.date_id]
        );
        return {
          ...date,
          time_slots: timeSlotsResult.rows
        };
      })
    );
    
    // Get active and completed counts for analytics
    const activeResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status != 'completed' OR status IS NULL"
    );
    const completedResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'"
    );
    
    // Get total customers count for analytics
    const totalCustomersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count) || 0;
    
    res.render('adminDashboard', {
      section: 'dates-times',
      datesWithTimes: datesWithTimes,
      activeAppointments: [],
      completedAppointments: [],
      analytics: {
        totalCustomers: totalCustomers,
        totalAppointments: parseInt(activeResult.rows[0].count) + parseInt(completedResult.rows[0].count)
      },
      services: [],
      testimonials: [],
      error: error,
      success: success
    });
  } catch (error) {
    console.error('Error loading dates & times:', error);
    res.render('adminDashboard', {
      section: 'dates-times',
      datesWithTimes: [],
      activeAppointments: [],
      completedAppointments: [],
      analytics: { 
        totalCustomers: 0,
        totalAppointments: 0 
      },
      services: [],
      testimonials: [],
      error: 'Error loading dates & times'
    });
  }
});

// SERVICES PAGE
app.get('/admin/services', requireAuth, async (req, res) => {
  try {
    const tab = req.query.tab || 'cleaning-types'; // Default tab
    
    // Fetch all data for services management
    // Cleaning Types with Prices
    const cleaningTypesResult = await pool.query(
      `SELECT ct.cleaning_type_id, ct.name, ct.description,
              cp.price_1_bed, cp.price_2_bed, cp.price_3_bed, cp.price_4_bed
       FROM cleaning_types ct
       LEFT JOIN cleaning_prices cp ON ct.cleaning_type_id = cp.cleaning_type_id
       ORDER BY ct.cleaning_type_id`
    );
    
    // Bedroom Options
    const bedroomOptionsResult = await pool.query(
      'SELECT bedroom_count, label, icon, display_order FROM bedroom_options ORDER BY display_order'
    );
    
    // Add-on Services (Extras)
    const extrasResult = await pool.query(
      'SELECT add_on_id, name, price, description FROM add_on_services ORDER BY add_on_id'
    );
    
    // Frequency Options
    const frequencyResult = await pool.query(
      'SELECT frequency_id, name, description, discount_percent FROM frequency ORDER BY frequency_id'
    );
    
    // Available Dates with Time Slots
    const datesResult = await pool.query(
      'SELECT date_id, available_date, is_available, max_bookings FROM available_dates ORDER BY available_date ASC'
    );
    
    const datesWithTimes = await Promise.all(
      datesResult.rows.map(async (date) => {
        const timeSlotsResult = await pool.query(
          'SELECT time_slot_id, time_slot, is_available, max_bookings FROM available_time_slots WHERE date_id = $1 ORDER BY time_slot ASC',
          [date.date_id]
        );
        return {
          ...date,
          time_slots: timeSlotsResult.rows
        };
      })
    );
    
    // Get active and completed counts for analytics
    const activeResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status != 'completed' OR status IS NULL"
    );
    const completedResult = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'"
    );
    
    // Get total customers count for analytics
    const totalCustomersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count) || 0;
    
  res.render('adminDashboard', {
    section: 'services',
      servicesTab: tab,
      cleaningTypes: cleaningTypesResult.rows,
      bedroomOptions: bedroomOptionsResult.rows,
      extras: extrasResult.rows,
      frequencies: frequencyResult.rows,
      datesWithTimes: datesWithTimes,
      activeAppointments: [],
      completedAppointments: [],
      analytics: {
        totalCustomers: totalCustomers,
        totalAppointments: parseInt(activeResult.rows[0].count) + parseInt(completedResult.rows[0].count)
      },
      services: [],
      testimonials: [],
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error loading services:', error);
    res.render('adminDashboard', {
      section: 'services',
      servicesTab: 'cleaning-types',
      cleaningTypes: [],
      bedroomOptions: [],
      extras: [],
      frequencies: [],
      datesWithTimes: [],
      activeAppointments: [],
      completedAppointments: [],
      analytics: { 
        totalCustomers: 0,
        totalAppointments: 0 
      },
      services: [],
      testimonials: [],
      error: 'Error loading services',
      success: null
    });
  }
});

// Services page
app.get('/services', async (req, res) => {
  try {
    // Fetch cleaning types with prices
    const cleaningTypesResult = await pool.query(
      `SELECT ct.cleaning_type_id, ct.name, ct.description,
              cp.price_1_bed, cp.price_2_bed, cp.price_3_bed, cp.price_4_bed
       FROM cleaning_types ct
       LEFT JOIN cleaning_prices cp ON ct.cleaning_type_id = cp.cleaning_type_id
       ORDER BY ct.cleaning_type_id`
    );
    
    // Fetch add-on services (extras)
    const extrasResult = await pool.query(
      'SELECT add_on_id, name, price, description FROM add_on_services ORDER BY add_on_id'
    );
    
    res.render('services', { 
      cleaningTypes: cleaningTypesResult.rows,
      extras: extrasResult.rows
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    // Fallback on error
    res.render('services', { 
      cleaningTypes: [],
      extras: []
    });
  }
});



// =========================
// STEP GUARD
// =========================
function requireStep(minStep) {
  return (req, res, next) => {
    if (!req.session.step || req.session.step < minStep) {
      return res.redirect("/cleaningType");
    }
    next();
  };
}

// =========================
// BOOKING FLOW
// =========================

// STEP 1 – Cleaning Details
app.get("/cleaningType", async (req, res) => {
  try {
  req.session.step = 0;
    
    // Fetch bedroom options from database
    const bedroomResult = await pool.query(
      'SELECT bedroom_count, label, icon FROM bedroom_options ORDER BY display_order'
    );
    
    const bedroomOptions = bedroomResult.rows.map(row => ({
      value: String(row.bedroom_count),
      label: row.label,
      icon: row.icon || '🏠',
      count: row.bedroom_count
    }));
    
    // Fetch cleaning types from database
    const cleaningResult = await pool.query(
      'SELECT cleaning_type_id, name, description FROM cleaning_types ORDER BY cleaning_type_id'
    );
    
    const cleaningTypes = cleaningResult.rows.map(row => ({
      value: row.name,
      label: row.name,
      icon: row.name.includes('Residential') ? '🧹' : '🛎️',
      id: row.cleaning_type_id
    }));
    
    // Fetch cleaning prices for bedroom options
    const priceResult = await pool.query(
      'SELECT cleaning_type_id, price_1_bed, price_2_bed, price_3_bed, price_4_bed FROM cleaning_prices'
    );
    
    const bedroomPrices = {};
    priceResult.rows.forEach(row => {
      bedroomPrices[row.cleaning_type_id] = {
        '1': row.price_1_bed || 0,
        '2': row.price_2_bed || 0,
        '3': row.price_3_bed || 0,
        '4': row.price_4_bed || 0
      };
    });

    // Calculate partial price if selections are made
    const priceInfo = await calculatePartialPrice(req.session);
    
    res.render("booking/cleaningType", { 
      currentStep: 1,
      bedroomOptions: bedroomOptions.length > 0 ? bedroomOptions : [
        { value: "1", label: "1 Bedroom", icon: "🏠" },
        { value: "2", label: "2 Bedrooms", icon: "🏡" },
        { value: "3", label: "3 Bedrooms", icon: "🏘️" },
        { value: "4", label: "4 Bedrooms", icon: "🏘️+" }
      ],
      cleaningTypes: cleaningTypes.length > 0 ? cleaningTypes : [
        { value: "Residential", label: "Residential Cleaning", icon: "🧹" },
        { value: "Vacation Rental", label: "Vacation Rental", icon: "🛎️" }
      ],
      bedroomPrices: bedroomPrices,
      priceInfo: priceInfo
    });
  } catch (error) {
    console.error('Error fetching cleaning types and bedroom options:', error);
    // Fallback to hardcoded options
    res.render("booking/cleaningType", { 
      currentStep: 1,
      bedroomOptions: [
        { value: "1", label: "1 Bedroom", icon: "🏠" },
        { value: "2", label: "2 Bedrooms", icon: "🏡" },
        { value: "3", label: "3 Bedrooms", icon: "🏘️" },
        { value: "4", label: "4 Bedrooms", icon: "🏘️+" }
      ],
      cleaningTypes: [
        { value: "Residential", label: "Residential Cleaning", icon: "🧹" },
        { value: "Vacation Rental", label: "Vacation Rental", icon: "🛎️" }
      ]
    });
  }
});

app.post("/extra", (req, res) => {
  req.session.step1 = req.body;
  req.session.step = 1;
  res.redirect("/extra");
});

app.get("/extra", requireStep(1), async (req, res) => {
  try {
    // Fetch add-on services from database
    const result = await pool.query(
      'SELECT add_on_id, name, price, description FROM add_on_services ORDER BY add_on_id'
    );
    
    const addOns = result.rows.map(row => {
      // Map icon based on service name
      let icon = '✨';
      const serviceName = row.name || '';
      const nameLower = serviceName.toLowerCase();
      if (nameLower.includes('fridge')) icon = '❄️';
      else if (nameLower.includes('oven')) icon = '🔥';
      else if (nameLower.includes('window')) icon = '🪟';
      else if (nameLower.includes('dish')) icon = '🍽️';
      else if (nameLower.includes('laundry')) icon = '🧺';
      
      return {
        value: String(row.add_on_id), // Use add_on_id as value for database reference (for form submission)
        label: serviceName || `Add-on ${row.add_on_id}`, // Use the name from database, ensure it's not empty
        icon: icon,
        price: row.price,
        description: row.description
      };
    });
    
    console.log('Add-ons fetched from database:', addOns.map(a => ({ id: a.value, label: a.label })));

    // Calculate partial price including extras
    const priceInfo = await calculatePartialPrice(req.session);
    
    res.render("booking/extras", { 
      currentStep: 2,
      addOns: addOns.length > 0 ? addOns : [
        { value: "inside_fridge", label: "Inside Fridge", icon: "❄️" },
        { value: "inside_oven", label: "Inside Oven", icon: "🔥" },
        { value: "windows", label: "Interior Windows", icon: "🪟" },
        { value: "dish_washing", label: "Dish Washing (30 min)", icon: "🍽️" },
        { value: "laundry", label: "Load of Laundry", icon: "🧺" }
      ],
      priceInfo: priceInfo
    });
  } catch (error) {
    console.error('Error fetching add-on services:', error);
    // Fallback to hardcoded options
    res.render("booking/extras", { 
      currentStep: 2,
      addOns: [
        { value: "inside_fridge", label: "Inside Fridge", icon: "❄️" },
        { value: "inside_oven", label: "Inside Oven", icon: "🔥" },
        { value: "windows", label: "Interior Windows", icon: "🪟" },
        { value: "dish_washing", label: "Dish Washing (30 min)", icon: "🍽️" },
        { value: "laundry", label: "Load of Laundry", icon: "🧺" }
      ]
    });
  }
});

// STEP 2 – Extras
app.post("/frequency", (req, res) => {
  req.session.step2 = req.body;
  req.session.step = 2;
  res.redirect("/frequency");
});

app.get("/frequency", requireStep(2), async (req, res) => {
  try {
    // Fetch ONLY available dates from database (set by admin) - these are the only dates users can book
    const availableDatesResult = await pool.query(
      `SELECT date_id, available_date, is_available, max_bookings 
       FROM available_dates 
       WHERE is_available = TRUE 
       AND available_date >= CURRENT_DATE 
       ORDER BY available_date ASC 
       LIMIT 60`
    );
    
    const availableDates = availableDatesResult.rows.map(row => ({
      id: row.date_id,
      date: row.available_date,
      formatted: new Date(row.available_date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      available: row.is_available,
      maxBookings: row.max_bookings
    }));
    
    // Fetch frequency options from database
    const result = await pool.query(
      'SELECT frequency_id, name, description, discount_percent FROM frequency ORDER BY frequency_id'
    );
    
    const frequencies = result.rows.map(row => {
      // Map icon based on frequency name
      let icon = '📅';
      const nameLower = row.name.toLowerCase();
      if (nameLower.includes('one-time') || nameLower.includes('one time')) icon = '🧹';
      else if (nameLower.includes('weekly')) icon = '📆';
      else if (nameLower.includes('bi-weekly') || nameLower.includes('biweekly')) icon = '⏳';
      else if (nameLower.includes('monthly')) icon = '🌙';
      
      // Create label and description
      let label = row.name;
      if (nameLower === 'bi-weekly' || nameLower === 'biweekly') {
        label = 'Every 2 Weeks';
      } else if (nameLower.includes('one-time')) {
        label = 'One-Time Cleaning';
      } else if (nameLower === 'weekly') {
        label = 'Weekly Cleaning';
      } else if (nameLower === 'monthly') {
        label = 'Monthly Cleaning';
      }
      
      let desc = row.description || '';
      if (!desc) {
        if (nameLower.includes('one-time')) desc = 'Good for occasional cleanings.';
        else if (nameLower === 'weekly') desc = 'Our best recurring option.';
        else if (nameLower.includes('bi-weekly')) desc = 'Great balance for most households.';
        else if (nameLower === 'monthly') desc = 'Perfect for light maintenance.';
      }
      
      // Add discount info if available
      if (row.discount_percent > 0) {
        desc += ` (${row.discount_percent}% discount)`;
      }
      
      return {
        value: row.name,
        label: label,
        desc: desc,
        icon: icon,
        id: row.frequency_id,
        discount_percent: row.discount_percent || 0
      };
    });


    // Calculate partial price with potential discount
    const partialPrice = await calculatePartialPrice(req.session);
    const frequencyName = req.session.step3?.frequency || 'One-Time';
    
    // Get discount percent for selected frequency (if any)
    let discountPercent = 0;
    if (frequencyName) {
      const freqResult = await pool.query(
        'SELECT discount_percent FROM frequency WHERE name = $1',
        [frequencyName]
      );
      if (freqResult.rows.length > 0) {
        discountPercent = parseInt(freqResult.rows[0].discount_percent) || 0;
      }
    }
    
    const discount = (partialPrice.subtotal * discountPercent) / 100;
    const total = partialPrice.subtotal - discount;
    
    const priceInfo = {
      ...partialPrice,
      discount,
      discountPercent,
      total: Math.max(0, total)
    };
    
    res.render("booking/frequency", { 
      currentStep: 3,
      frequencies: frequencies.length > 0 ? frequencies : [
        { value: "One-Time", label: "One-Time Cleaning", desc: "Good for occasional cleanings.", icon: "🧹" },
        { value: "Weekly", label: "Weekly Cleaning", desc: "Our best recurring option.", icon: "📆" },
        { value: "Bi-Weekly", label: "Every 2 Weeks", desc: "Great balance for most households.", icon: "⏳" },
        { value: "Monthly", label: "Monthly Cleaning", desc: "Perfect for light maintenance.", icon: "🌙" }
      ],
      availableDates: availableDates,
      priceInfo: priceInfo
    });
  } catch (error) {
    console.error('Error fetching frequency options:', error);
    // Fallback to hardcoded options
    res.render("booking/frequency", { 
      currentStep: 3,
      frequencies: [
        { value: "One-Time", label: "One-Time Cleaning", desc: "Good for occasional cleanings.", icon: "🧹" },
        { value: "Weekly", label: "Weekly Cleaning", desc: "Our best recurring option.", icon: "📆" },
        { value: "Bi-Weekly", label: "Every 2 Weeks", desc: "Great balance for most households.", icon: "⏳" },
        { value: "Monthly", label: "Monthly Cleaning", desc: "Perfect for light maintenance.", icon: "🌙" }
      ],
      availableDates: [],
      priceInfo: {
        basePrice: 0,
        extrasTotal: 0,
        subtotal: 0,
        discount: 0,
        discountPercent: 0,
        total: 0
      }
    });
  }
});

// API: Get time slots for a specific date
// API: Get available date by date string
app.get("/api/available-dates", async (req, res) => {
  try {
    const date = req.query.date;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }
    
    const result = await pool.query(
      'SELECT date_id, available_date, is_available, max_bookings FROM available_dates WHERE available_date = $1',
      [date]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({ date_id: null });
    }
  } catch (error) {
    console.error('Error fetching available date:', error);
    res.status(500).json({ error: 'Failed to fetch available date' });
  }
});

// API: Get time slots for a specific date
// ROUTE: GET /api/time-slots/:dateId
// Purpose: Returns available time slots for a given date ID
app.get("/api/time-slots/:dateId", async (req, res) => {
  try {
    const dateId = parseInt(req.params.dateId);
    
    if (isNaN(dateId)) {
      return res.status(400).json({ error: 'Invalid date ID' });
    }
    
    // Query available time slots for this date
    const result = await pool.query(
      `SELECT time_slot_id, time_slot, is_available, max_bookings 
       FROM available_time_slots 
       WHERE date_id = $1 AND is_available = TRUE 
       ORDER BY time_slot ASC`,
      [dateId]
    );
    
    // Return time slots with correct property name (time_slot) that frontend expects
    const timeSlots = result.rows.map(row => ({
      time_slot_id: row.time_slot_id,
      time_slot: row.time_slot,
      is_available: row.is_available,
      max_bookings: row.max_bookings
    }));
    
    console.log(`✓ Fetched ${timeSlots.length} time slots for date_id: ${dateId}`);
    return res.json(timeSlots);
    
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

// STEP 3 – Frequency
app.post("/yourdetails-start", (req, res) => {
  req.session.step3 = req.body; // Includes frequency, requested_date, requested_time
  req.session.step = 3;
  res.redirect("/yourdetails");
});

// STEP 4 – Your Details
app.get("/yourdetails", requireStep(3), async (req, res) => {
  try {
    // Calculate price info for display
    const priceInfo = await calculatePartialPrice(req.session);
    res.render("booking/yourdetails", { 
      currentStep: 4,
      priceInfo: priceInfo
    });
  } catch (error) {
    console.error('Error loading your details page:', error);
    res.render("booking/yourdetails", { 
      currentStep: 4,
      priceInfo: { basePrice: 0, extrasTotal: 0, subtotal: 0 }
    });
  }
});

app.post("/yourdetails", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address_line1, address_line2, city, state, zipcode } = req.body;
    const bedrooms = req.session.step1?.bedrooms; // Get bedrooms from step 1
    
    // Check if customer already exists by email
    let customerResult = await pool.query(
      'SELECT customer_id FROM customers WHERE email = $1',
      [email]
    );
    
    let customerId;
    
    if (customerResult.rows.length > 0) {
      // Customer exists, use existing customer_id
      customerId = customerResult.rows[0].customer_id;
      
      // Update customer info in case it changed
      await pool.query(
        'UPDATE customers SET first_name = $1, last_name = $2, phone = $3 WHERE customer_id = $4',
        [first_name, last_name, phone, customerId]
      );
    } else {
      // Generate next customer ID
      const maxCustomerResult = await pool.query(
        'SELECT MAX(customer_id) as max_id FROM customers'
      );
      const nextCustomerId = maxCustomerResult.rows[0]?.max_id 
        ? parseInt(maxCustomerResult.rows[0].max_id) + 1 
        : 1000; // Start at 1000 if no customers exist
      
      // Create new customer with explicit ID
      const newCustomer = await pool.query(
        'INSERT INTO customers (customer_id, first_name, last_name, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING customer_id',
        [nextCustomerId, first_name, last_name, email, phone]
      );
      customerId = newCustomer.rows[0].customer_id;
    }
    
    // Check if property already exists for this customer with same address
    const existingPropertyResult = await pool.query(
      'SELECT property_id FROM properties WHERE customer_id = $1 AND address_line1 = $2 AND zipcode = $3',
      [customerId, address_line1, zipcode]
    );
    
    let propertyId;
    if (existingPropertyResult.rows.length > 0) {
      // Property exists, use existing property_id
      propertyId = existingPropertyResult.rows[0].property_id;
      
      // Update property info in case it changed
      await pool.query(
        'UPDATE properties SET address_line2 = $1, city = $2, state = $3, bedrooms = $4 WHERE property_id = $5',
        [address_line2 || null, city, state, parseInt(bedrooms) || 1, propertyId]
      );
    } else {
      // Generate next property ID
      const maxPropertyResult = await pool.query(
        'SELECT MAX(property_id) as max_id FROM properties'
      );
      const nextPropertyId = maxPropertyResult.rows[0]?.max_id 
        ? parseInt(maxPropertyResult.rows[0].max_id) + 1 
        : 2000; // Start at 2000 if no properties exist
      
      // Create property record with explicit ID
      const propertyResult = await pool.query(
        'INSERT INTO properties (property_id, customer_id, address_line1, address_line2, city, state, zipcode, bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING property_id',
        [nextPropertyId, customerId, address_line1, address_line2 || null, city, state, zipcode, parseInt(bedrooms) || 1]
      );
      propertyId = propertyResult.rows[0].property_id;
    }
    
    // Store in session for later use in booking creation
  req.session.step4 = req.body;
    req.session.customer_id = customerId;
    req.session.property_id = propertyId;
  req.session.step = 4;
    
  res.redirect("/review");
  } catch (error) {
    console.error('Error saving customer/property details:', error);
    // If database save fails, still store in session and redirect
  req.session.step4 = req.body;
  req.session.step = 4;
  res.redirect("/review");
  }
});

// STEP 5 – Review
app.get("/review", requireStep(4), async (req, res) => {
  try {
    // Initialize all steps as empty objects if they don't exist
    const step1 = req.session.step1 || {};
    const step2 = req.session.step2 || {};
    const step3 = req.session.step3 || {};
    const step4 = req.session.step4 || {};
    
    // Fetch add-on names from database if extras were selected
    let addOnNames = [];
    
    // Debug: log what's in session
    console.log('Review page - session.step2:', req.session.step2);
    console.log('Review page - session.step2.extras:', step2.extras);
    
    if (step2.extras) {
      // Handle both array and single value cases
      const extras = Array.isArray(step2.extras) 
        ? step2.extras 
        : [step2.extras];
      
      // Filter out empty values and convert to integers
      const addOnIds = extras
        .filter(e => e !== null && e !== undefined && e !== '')
        .map(id => {
          // Convert string to number
          const numId = typeof id === 'string' ? parseInt(id, 10) : id;
          return !isNaN(numId) ? numId : null;
        })
        .filter(id => id !== null);
      
      console.log('Review page - extracted add-on IDs:', addOnIds);
      
      if (addOnIds.length > 0) {
        // Build query with placeholders
        const placeholders = addOnIds.map((_, i) => `$${i + 1}`).join(',');
        const query = `SELECT add_on_id, name, price FROM add_on_services WHERE add_on_id IN (${placeholders}) ORDER BY add_on_id`;
        
        console.log('Review page - query:', query);
        console.log('Review page - params:', addOnIds);
        
        const result = await pool.query(query, addOnIds);
        
        console.log('Review page - query result:', result.rows);
        
        addOnNames = result.rows.map(row => ({
          id: row.add_on_id,
          name: row.name || `Add-on ${row.add_on_id}`,
          price: row.price
        }));
      }
    }

    console.log('Review page - final addOnNames:', addOnNames);
    
    // Calculate full price breakdown
    const totals = await calculateBookingTotal(req.session);

    res.render("booking/review", { 
      currentStep: 5,
      addOnNames: addOnNames, // Pass add-on names to template
      priceBreakdown: totals // Pass detailed price breakdown
    });
  } catch (error) {
    console.error('Error fetching add-on names for review:', error);
    console.error('Error stack:', error.stack);
    // Render with empty add-on names if query fails
    res.render("booking/review", { 
      currentStep: 5,
      addOnNames: []
    });
  }
});

// POST route to save comments from review page
app.post("/review", requireStep(4), (req, res) => {
  // Save comments to session
  if (!req.session.step4) {
    req.session.step4 = {};
  }
  req.session.step4.comments = req.body.comments || '';
  // Stay on review page to continue reviewing
  res.redirect("/review");
});

// STEP 6 – Payment (This route may not be needed, but keeping for backward compatibility)
// Note: Payment form now posts directly to /summary
app.post("/payment", (req, res) => {
  // Save comments if provided
  if (req.body.comments && !req.session.step4) {
    req.session.step4 = {};
  }
  if (req.body.comments) {
    req.session.step4.comments = req.body.comments;
  }
  
  req.session.payment = req.body;
  req.session.step = 5;
  res.redirect("/payment");
});

// Helper function to calculate partial price (base + extras so far, no discount yet)
async function calculatePartialPrice(session) {
  try {
    const bedrooms = parseInt(session.step1?.bedrooms) || 1;
    const cleaningTypeName = session.step1?.cleaningType || '';
    const extras = session.step2?.extras || [];
    
    let basePrice = 0;
    let extrasTotal = 0;
    
    // Get base price if cleaning type is selected
    if (cleaningTypeName) {
      const cleaningTypeResult = await pool.query(
        'SELECT cleaning_type_id, name FROM cleaning_types WHERE name = $1',
        [cleaningTypeName]
      );
      
      if (cleaningTypeResult.rows.length > 0) {
        const cleaningTypeId = cleaningTypeResult.rows[0].cleaning_type_id;
        const priceKey = `price_${bedrooms}_bed`;
        const cleaningPriceResult = await pool.query(
          `SELECT ${priceKey} FROM cleaning_prices WHERE cleaning_type_id = $1`,
          [cleaningTypeId]
        );
        
        if (cleaningPriceResult.rows.length > 0 && cleaningPriceResult.rows[0][priceKey]) {
          basePrice = parseInt(cleaningPriceResult.rows[0][priceKey]);
        }
      }
    }
    
    // Get extras prices if extras are selected
    if (extras.length > 0) {
      const extrasArray = Array.isArray(extras) ? extras : [extras];
      const addOnIds = extrasArray.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      if (addOnIds.length > 0) {
        const placeholders = addOnIds.map((_, i) => `$${i + 1}`).join(',');
        const extrasResult = await pool.query(
          `SELECT price FROM add_on_services WHERE add_on_id IN (${placeholders})`,
          addOnIds
        );
        extrasTotal = extrasResult.rows.reduce((sum, row) => sum + (parseInt(row.price) || 0), 0);
      }
    }
    
    return {
      basePrice,
      extrasTotal,
      subtotal: basePrice + extrasTotal
    };
  } catch (error) {
    console.error('Error calculating partial price:', error);
    return { basePrice: 0, extrasTotal: 0, subtotal: 0 };
  }
}

// Helper function to calculate booking total
async function calculateBookingTotal(session) {
  try {
    const bedrooms = parseInt(session.step1?.bedrooms) || 1;
    const cleaningTypeName = session.step1?.cleaningType || '';
    const frequencyName = session.step3?.frequency || 'One-Time';
    const extras = session.step2?.extras || [];
    
    // Get cleaning type ID and base price
    const cleaningTypeResult = await pool.query(
      'SELECT cleaning_type_id, name FROM cleaning_types WHERE name = $1',
      [cleaningTypeName]
    );
    
    if (cleaningTypeResult.rows.length === 0) {
      throw new Error('Cleaning type not found');
    }
    
    const cleaningTypeId = cleaningTypeResult.rows[0].cleaning_type_id;
    
    // Get base price based on bedrooms
    const priceKey = `price_${bedrooms}_bed`;
    const cleaningPriceResult = await pool.query(
      `SELECT ${priceKey} FROM cleaning_prices WHERE cleaning_type_id = $1`,
      [cleaningTypeId]
    );
    
    let basePrice = 0;
    if (cleaningPriceResult.rows.length > 0 && cleaningPriceResult.rows[0][priceKey]) {
      basePrice = parseInt(cleaningPriceResult.rows[0][priceKey]);
    }
    
    // Get extras prices
    let extrasTotal = 0;
    if (extras.length > 0) {
      const extrasArray = Array.isArray(extras) ? extras : [extras];
      const addOnIds = extrasArray.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      if (addOnIds.length > 0) {
        const placeholders = addOnIds.map((_, i) => `$${i + 1}`).join(',');
        const extrasResult = await pool.query(
          `SELECT price FROM add_on_services WHERE add_on_id IN (${placeholders})`,
          addOnIds
        );
        extrasTotal = extrasResult.rows.reduce((sum, row) => sum + (parseInt(row.price) || 0), 0);
      }
    }
    
    // Get frequency discount
    const frequencyResult = await pool.query(
      'SELECT discount_percent FROM frequency WHERE name = $1',
      [frequencyName]
    );
    
    let discountPercent = 0;
    if (frequencyResult.rows.length > 0) {
      discountPercent = parseInt(frequencyResult.rows[0].discount_percent) || 0;
    }
    
    // Calculate total
    const subtotal = basePrice + extrasTotal;
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount;
    
    return {
      basePrice,
      extrasTotal,
      discount,
      discountPercent,
      total: Math.max(0, total) // Ensure total is never negative
    };
  } catch (error) {
    console.error('Error calculating booking total:', error);
    // Return default values if calculation fails
    return {
      basePrice: 0,
      extrasTotal: 0,
      discount: 0,
      discountPercent: 0,
      total: 0
    };
  }
}

app.get("/payment", requireStep(5), async (req, res) => {
  try {
    // Calculate total amount
    const totals = await calculateBookingTotal(req.session);
    
    res.render("booking/payment", { 
      currentStep: 6,
      totalAmount: totals.total,
      totals: totals
    });
  } catch (error) {
    console.error('Error loading payment page:', error);
    res.render("booking/payment", { 
      currentStep: 6,
      totalAmount: 0
    });
  }
});

// STEP 6 – Payment Summary/Confirmation
app.post("/summary", async (req, res) => {
  try {
    // Initialize all steps as empty objects if they don't exist
    const step1 = req.session.step1 || {};
    const step2 = req.session.step2 || {};
    const step3 = req.session.step3 || {};
    const step4 = req.session.step4 || {};
    
    console.log('=== SUMMARY ROUTE CALLED ===');
    console.log('Session data:', {
      customer_id: req.session.customer_id,
      property_id: req.session.property_id,
      step: req.session.step,
      hasStep1: !!req.session.step1,
      hasStep2: !!req.session.step2,
      hasStep3: !!req.session.step3,
      hasStep4: !!req.session.step4
    });
    
    // Calculate totals
    const totals = await calculateBookingTotal(req.session);
    
    // Verify we have all required session data
    if (!req.session.customer_id || !req.session.property_id) {
      console.error('Missing customer_id or property_id in session');
      console.error('Attempting to recreate customer/property from step4...');
      
      // Try to recreate customer/property from step4 if missing
      if (step4 && Object.keys(step4).length > 0) {
        const { first_name, last_name, email, phone, address_line1, address_line2, city, state, zipcode } = step4;
        const bedrooms = step1?.bedrooms;
        
        // Recreate customer
        let customerResult = await pool.query(
          'SELECT customer_id FROM customers WHERE email = $1',
          [email]
        );
        
        let customerId;
        if (customerResult.rows.length > 0) {
          customerId = customerResult.rows[0].customer_id;
        } else {
          // Generate next customer ID
          const maxCustomerResult = await pool.query(
            'SELECT MAX(customer_id) as max_id FROM customers'
          );
          const nextCustomerId = maxCustomerResult.rows[0]?.max_id 
            ? parseInt(maxCustomerResult.rows[0].max_id) + 1 
            : 1000;
          
          // Create new customer with explicit ID
          const newCustomer = await pool.query(
            'INSERT INTO customers (customer_id, first_name, last_name, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING customer_id',
            [nextCustomerId, first_name, last_name, email, phone]
          );
          customerId = newCustomer.rows[0].customer_id;
        }
        
        // Check if property already exists for this customer with same address
        const existingPropertyResult = await pool.query(
          'SELECT property_id FROM properties WHERE customer_id = $1 AND address_line1 = $2 AND zipcode = $3',
          [customerId, address_line1, zipcode]
        );
        
        let propertyId;
        if (existingPropertyResult.rows.length > 0) {
          // Property exists, use existing property_id
          propertyId = existingPropertyResult.rows[0].property_id;
        } else {
          // Generate next property ID
          const maxPropertyResult = await pool.query(
            'SELECT MAX(property_id) as max_id FROM properties'
          );
          const nextPropertyId = maxPropertyResult.rows[0]?.max_id 
            ? parseInt(maxPropertyResult.rows[0].max_id) + 1 
            : 2000;
          
          // Create property record with explicit ID
          const propertyResult = await pool.query(
            'INSERT INTO properties (property_id, customer_id, address_line1, address_line2, city, state, zipcode, bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING property_id',
            [nextPropertyId, customerId, address_line1, address_line2 || null, city, state, zipcode, parseInt(bedrooms) || 1]
          );
          propertyId = propertyResult.rows[0].property_id;
        }
        
        req.session.customer_id = customerId;
        req.session.property_id = propertyId;
        
        console.log('Recreated customer_id:', customerId, 'property_id:', propertyId);
      } else {
        console.error('No step4 data available to recreate customer/property');
        return res.redirect("/review");
      }
    }
    
    // Get cleaning type ID
    const cleaningTypeName = step1?.cleaningType || '';
    const cleaningTypeResult = await pool.query(
      'SELECT cleaning_type_id FROM cleaning_types WHERE name = $1',
      [cleaningTypeName]
    );
    
    if (cleaningTypeResult.rows.length === 0) {
      throw new Error('Cleaning type not found');
    }
    const cleaningTypeId = cleaningTypeResult.rows[0].cleaning_type_id;
    
    // Get frequency ID
    const frequencyName = step3?.frequency || 'One-Time';
    const frequencyResult = await pool.query(
      'SELECT frequency_id FROM frequency WHERE name = $1',
      [frequencyName]
    );
    
    if (frequencyResult.rows.length === 0) {
      throw new Error('Frequency not found');
    }
    const frequencyId = frequencyResult.rows[0].frequency_id;
    
    // Generate next booking ID (simple approach - get max + 1, or use SERIAL if available)
    const maxBookingResult = await pool.query(
      'SELECT MAX(booking_id) as max_id FROM bookings'
    );
    const nextBookingId = maxBookingResult.rows[0]?.max_id 
      ? parseInt(maxBookingResult.rows[0].max_id) + 1 
      : 6000; // Start at 6000 if no bookings exist
    
    // Get requested date and time from step3
    const requestedDate = step3?.requested_date || null;
    const requestedTime = step3?.requested_time || null;
    
    // Function to calculate recurring dates based on frequency (uses frequencyName from above)
    function calculateRecurringDates(startDate, frequency, numOccurrences = 12) {
      const dates = [startDate];
      const start = new Date(startDate);
      
      for (let i = 1; i < numOccurrences; i++) {
        const nextDate = new Date(start);
        const freqLower = frequency.toLowerCase();
        
        if (freqLower.includes('weekly')) {
          nextDate.setDate(start.getDate() + (i * 7));
        } else if (freqLower.includes('bi-weekly') || freqLower.includes('biweekly')) {
          nextDate.setDate(start.getDate() + (i * 14));
        } else if (freqLower.includes('monthly')) {
          nextDate.setMonth(start.getMonth() + i);
        } else {
          // One-Time or unknown, only return start date
          break;
        }
        
        dates.push(nextDate.toISOString().split('T')[0]);
      }
      
      return dates;
    }
    
    // Validate required data
    if (!requestedDate || !requestedTime) {
      console.error('Missing requested_date or requested_time in session');
      return res.render("booking/summary", {
        error: "Missing date or time information. Please go back and select a date and time."
      });
    }
    
    // STRICT CHECK: For one-time bookings, check if ANY booking exists for this customer+property+date+time
    // For recurring, only check the first date
    const frequencyLower = frequencyName.toLowerCase();
    const isRecurring = !frequencyLower.includes('one-time') && !frequencyLower.includes('one time') && !frequencyLower.includes('one-time');
    
    // Check if booking already exists to prevent duplicates (ALWAYS check before creating)
    const existingBookingCheck = await pool.query(
      'SELECT booking_id FROM bookings WHERE customer_id = $1 AND property_id = $2 AND requested_date = $3 AND requested_time = $4 LIMIT 1',
      [req.session.customer_id, req.session.property_id, requestedDate, requestedTime]
    );
    
    if (existingBookingCheck.rows.length > 0) {
      console.log('Booking already exists for this customer+property+date+time, redirecting to existing summary');
      return res.redirect(`/summary?booking_id=${existingBookingCheck.rows[0].booking_id}`);
    }
    
    // FOR ONE-TIME BOOKINGS: ONLY create 1 booking - no loop, no multiple records
    let bookingDates = [requestedDate]; // Default to single booking for one-time
    
    // Only calculate recurring dates if it's actually recurring
    if (isRecurring && requestedDate) {
      // Get number of weeks from form (default to 4 if not provided)
      const numberOfWeeks = parseInt(step3?.number_of_weeks) || 4;
      
      // Calculate number of occurrences based on frequency type
      // The number_of_weeks field represents how many weeks to schedule
      let numOccurrences;
      if (frequencyLower.includes('weekly')) {
        // Weekly: 1 booking per week
        numOccurrences = numberOfWeeks;
      } else if (frequencyLower.includes('bi-weekly') || frequencyLower.includes('biweekly')) {
        // Bi-weekly: 1 booking every 2 weeks
        numOccurrences = Math.ceil(numberOfWeeks / 2);
      } else if (frequencyLower.includes('monthly')) {
        // Monthly: 1 booking per month (approximately 4 weeks)
        numOccurrences = Math.ceil(numberOfWeeks / 4);
      } else {
        // Default: treat as weekly
        numOccurrences = numberOfWeeks;
      }
      
      // Ensure at least 1 occurrence and reasonable maximum
      numOccurrences = Math.max(1, Math.min(numOccurrences, 52)); // Max 52 occurrences
      
      console.log(`Creating recurring bookings: ${frequencyName} for ${numberOfWeeks} weeks = ${numOccurrences} occurrences`);
      
      // Create bookings based on calculated occurrences
      bookingDates = calculateRecurringDates(requestedDate, frequencyName, numOccurrences);
    }
    
    // ADDITIONAL SAFETY: For one-time, ensure we only have 1 date
    if (!isRecurring) {
      bookingDates = [requestedDate];
    }
    
    console.log(`Creating booking(s): Frequency="${frequencyName}", IsRecurring=${isRecurring}, Dates=${bookingDates.length}`);
    
    // Get extras OUTSIDE the loop so it's accessible later
    const extras = step2?.extras || [];
    
    const createdBookingIds = [];
    
    // FOR ONE-TIME: Skip loop entirely and create only 1 booking
    if (!isRecurring) {
      console.log('One-time booking detected - creating ONLY 1 booking record');
      
      // Final duplicate check before inserting
      const finalCheck = await pool.query(
        'SELECT booking_id FROM bookings WHERE customer_id = $1 AND property_id = $2 AND requested_date = $3 AND requested_time = $4 LIMIT 1',
        [req.session.customer_id, req.session.property_id, requestedDate, requestedTime]
      );
      
      if (finalCheck.rows.length > 0) {
        console.log('Duplicate detected in final check, redirecting to existing booking');
        return res.redirect(`/summary?booking_id=${finalCheck.rows[0].booking_id}`);
      }
      
      // Create ONLY ONE booking for one-time
      const bookingResult = await pool.query(
        `INSERT INTO bookings (
          booking_id, customer_id, property_id, cleaning_type_id, frequency_id, 
          requested_date, requested_time, total_due, comments, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING booking_id`,
        [
          nextBookingId,
          req.session.customer_id,
          req.session.property_id,
          cleaningTypeId,
          frequencyId,
          requestedDate,
          requestedTime,
          totals.total,
          step4?.comments || null,
          'active'
        ]
      );
      
      createdBookingIds.push(bookingResult.rows[0].booking_id);
      const currentBookingId = bookingResult.rows[0].booking_id;
      
      // Create booking add-ons for this single booking
      if (extras.length > 0) {
        const extrasArray = Array.isArray(extras) ? extras : [extras];
        const addOnIds = extrasArray
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
        
        if (addOnIds.length > 0) {
          for (const addOnId of addOnIds) {
            await pool.query(
              'INSERT INTO booking_add_ons (booking_id, add_on_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [currentBookingId, addOnId]
            );
          }
        }
      }
      
      // Create payment record
      const maxPaymentResult = await pool.query(
        'SELECT MAX(payment_id) as max_id FROM payments'
      );
      const nextPaymentId = maxPaymentResult.rows[0]?.max_id 
        ? parseInt(maxPaymentResult.rows[0].max_id) + 1 
        : 8000;
      
      const mockSessionId = `mock_${Date.now()}_${currentBookingId}`;
      await pool.query(
        `INSERT INTO payments (
          payment_id, booking_id, provider, provider_session_id, 
          amount, currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          nextPaymentId,
          currentBookingId,
          'mock_stripe',
          mockSessionId,
          totals.total,
          'USD',
          'paid'
        ]
      );
    } else {
      // RECURRING BOOKINGS: Create multiple bookings
      for (let i = 0; i < bookingDates.length; i++) {
        const bookingDate = bookingDates[i];
        if (!bookingDate) continue;
        
        const currentBookingId = nextBookingId + i;
        
        // Check for duplicate before each insert
        const duplicateCheck = await pool.query(
          'SELECT booking_id FROM bookings WHERE customer_id = $1 AND property_id = $2 AND requested_date = $3 AND requested_time = $4 LIMIT 1',
          [req.session.customer_id, req.session.property_id, bookingDate, requestedTime]
        );
        
        if (duplicateCheck.rows.length > 0) {
          console.log(`Duplicate found for date ${bookingDate}, skipping`);
          createdBookingIds.push(duplicateCheck.rows[0].booking_id);
          continue;
        }
        
        const bookingResult = await pool.query(
          `INSERT INTO bookings (
            booking_id, customer_id, property_id, cleaning_type_id, frequency_id, 
            requested_date, requested_time, total_due, comments, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING booking_id`,
          [
            currentBookingId,
            req.session.customer_id,
            req.session.property_id,
            cleaningTypeId,
            frequencyId,
            bookingDate,
            requestedTime,
            totals.total,
            step4?.comments || null,
            'active'
          ]
        );
        
        createdBookingIds.push(bookingResult.rows[0].booking_id);
        
        // Create booking add-ons records for each booking
        if (extras.length > 0) {
          const extrasArray = Array.isArray(extras) ? extras : [extras];
          const addOnIds = extrasArray
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));
          
          if (addOnIds.length > 0) {
            for (const addOnId of addOnIds) {
              await pool.query(
                'INSERT INTO booking_add_ons (booking_id, add_on_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [currentBookingId, addOnId]
              );
            }
          }
        }
        
        // Payment logic: Only first booking gets payment (paid upfront)
        // Other bookings are marked as unpaid in admin dashboard
        if (i === 0) {
          // First booking: Create payment record (paid)
          const maxPaymentResult = await pool.query(
            'SELECT MAX(payment_id) as max_id FROM payments'
          );
          const nextPaymentId = maxPaymentResult.rows[0]?.max_id 
            ? parseInt(maxPaymentResult.rows[0].max_id) + 1 
            : 8000;
          
          const mockSessionId = `mock_${Date.now()}_${currentBookingId}`;
          await pool.query(
            `INSERT INTO payments (
              payment_id, booking_id, provider, provider_session_id, 
              amount, currency, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              nextPaymentId,
              currentBookingId,
              'mock_stripe',
              mockSessionId,
              totals.total,
              'USD',
              'paid'
            ]
          );
          
          // Mark first booking status as 'active' (paid)
          await pool.query(
            'UPDATE bookings SET status = $1 WHERE booking_id = $2',
            ['active', currentBookingId]
          );
        } else {
          // Subsequent bookings: No payment record, status shows as 'unpaid'
          // Admin dashboard will check for payment record to determine paid/unpaid
          await pool.query(
            'UPDATE bookings SET status = $1 WHERE booking_id = $2',
            ['unpaid', currentBookingId]
          );
        }
      }
    }
    
    const bookingId = createdBookingIds[0]; // Use first booking ID for display
    
    // Fetch add-on names for display (use first booking) - extras is now defined outside loop
    let addOnNames = [];
    if (extras && extras.length > 0) {
      const extrasArray = Array.isArray(extras) ? extras : [extras];
      const addOnIds = extrasArray.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      if (addOnIds.length > 0) {
        const placeholders = addOnIds.map((_, i) => `$${i + 1}`).join(',');
        const addOnsResult = await pool.query(
          `SELECT add_on_id, name, price FROM add_on_services WHERE add_on_id IN (${placeholders}) ORDER BY add_on_id`,
          addOnIds
        );
        addOnNames = addOnsResult.rows.map(row => ({
          id: row.add_on_id,
          name: row.name,
          price: row.price
        }));
      }
    }
    
    console.log(`✓ Booking(s) created successfully!`);
    console.log(`  Primary Booking ID: ${bookingId}`);
    console.log(`  Total Bookings Created: ${createdBookingIds.length}`);
    console.log(`  Frequency: ${frequencyName}`);
    console.log(`  Customer: ${req.session.customer_id}`);
    console.log(`  Property: ${req.session.property_id}`);
    console.log(`  Total: $${totals.total.toFixed(2)}`);
    
    // Render confirmation page (DO NOT REDIRECT - this is the final page)
    console.log('Rendering summary page...');
    res.render("booking/summary", {
      bookingId: bookingId,
      addOnNames: addOnNames,
      paymentSummary: totals
    });
    
  } catch (error) {
    console.error('=== ERROR CREATING BOOKING ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Session data:', {
      customer_id: req.session.customer_id,
      property_id: req.session.property_id,
      step1: req.session.step1,
      step2: req.session.step2,
      step3: req.session.step3,
      step4: req.session.step4
    });
    console.error('===============================');
    
    // On error, try to show summary page anyway with error message, only redirect as last resort
    try {
      // Try to render summary page with error state
      const totals = await calculateBookingTotal(req.session).catch(() => ({
        basePrice: 0,
        extrasTotal: 0,
        discount: 0,
        discountPercent: 0,
        total: 0
      }));
      
      res.render("booking/summary", {
        bookingId: null,
        addOnNames: [],
        paymentSummary: totals,
        error: 'There was an error processing your booking. Please contact support.'
      });
    } catch (renderError) {
      // If even rendering fails, redirect to review
      console.error('Could not render summary page:', renderError);
      req.session.error = 'There was an error processing your booking. Please try again.';
      res.redirect("/review");
    }
  }
});

// =========================
// ADMIN SERVICES - DATE/TIME MANAGEMENT ROUTES
// =========================

// Delete date (and all its time slots due to CASCADE)
app.get('/admin/services/date/delete/:dateId', requireAuth, async (req, res) => {
  try {
    const dateId = parseInt(req.params.dateId);
    
    if (isNaN(dateId)) {
      return res.redirect('/admin/dates-times?error=' + encodeURIComponent('Invalid date ID'));
    }
    
    // Delete the date (time slots will be deleted automatically due to CASCADE)
    await pool.query('DELETE FROM available_dates WHERE date_id = $1', [dateId]);
    
    res.redirect('/admin/dates-times?success=' + encodeURIComponent('Date deleted successfully'));
  } catch (error) {
    console.error('Error deleting date:', error);
    res.redirect('/admin/dates-times?error=' + encodeURIComponent('Error deleting date'));
  }
});

// Delete time slot
app.get('/admin/services/time-slot/delete/:timeSlotId', requireAuth, async (req, res) => {
  try {
    const timeSlotId = parseInt(req.params.timeSlotId);
    
    if (isNaN(timeSlotId)) {
      return res.redirect('/admin/dates-times?error=' + encodeURIComponent('Invalid time slot ID'));
    }
    
    await pool.query('DELETE FROM available_time_slots WHERE time_slot_id = $1', [timeSlotId]);
    
    res.redirect('/admin/dates-times?success=' + encodeURIComponent('Time slot deleted successfully'));
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.redirect('/admin/dates-times?error=' + encodeURIComponent('Error deleting time slot'));
  }
});

// Bulk add dates from calendar selection
app.post('/admin/services/dates/bulk-add', requireAuth, async (req, res) => {
  try {
    const selectedDates = req.body.selected_dates?.split(',') || [];
    const isAvailable = req.body.is_available === 'true';
    const maxBookings = parseInt(req.body.max_bookings) || 10;
    
    if (selectedDates.length === 0) {
      return res.redirect('/admin/dates-times?error=' + encodeURIComponent('No dates selected'));
    }
    
    // Get next date_id
    const maxDateResult = await pool.query('SELECT MAX(date_id) as max_id FROM available_dates');
    let nextDateId = maxDateResult.rows[0]?.max_id ? parseInt(maxDateResult.rows[0].max_id) + 1 : 1;
    
    const addedDates = [];
    for (const dateStr of selectedDates) {
      if (!dateStr.trim()) continue;
      
      try {
        await pool.query(
          'INSERT INTO available_dates (date_id, available_date, is_available, max_bookings) VALUES ($1, $2, $3, $4) ON CONFLICT (available_date) DO UPDATE SET is_available = $3, max_bookings = $4',
          [nextDateId, dateStr.trim(), isAvailable, maxBookings]
        );
        addedDates.push(dateStr);
        nextDateId++;
      } catch (err) {
        console.error(`Error adding date ${dateStr}:`, err);
      }
    }
    
    res.redirect(`/admin/dates-times?success=${encodeURIComponent(addedDates.length + ' date(s) added successfully')}`);
  } catch (error) {
    console.error('Error bulk adding dates:', error);
    res.redirect('/admin/dates-times?error=' + encodeURIComponent('Error adding dates'));
  }
});

// Bulk add time slots to selected dates
app.post('/admin/services/time-slot/bulk-add', requireAuth, async (req, res) => {
  try {
    const selectedDateIds = req.body.selected_date_ids?.split(',') || [];
    const timeSlot = req.body.time_slot;
    const isAvailable = req.body.is_available === 'true';
    const maxBookings = parseInt(req.body.max_bookings) || 2;
    
    if (selectedDateIds.length === 0) {
      return res.redirect('/admin/dates-times?error=' + encodeURIComponent('No dates selected'));
    }
    
    if (!timeSlot) {
      return res.redirect('/admin/dates-times?error=' + encodeURIComponent('Time slot is required'));
    }
    
    // Get next time_slot_id
    const maxTimeSlotResult = await pool.query('SELECT MAX(time_slot_id) as max_id FROM available_time_slots');
    let nextTimeSlotId = maxTimeSlotResult.rows[0]?.max_id ? parseInt(maxTimeSlotResult.rows[0].max_id) + 1 : 1;
    
    let addedCount = 0;
    for (const dateIdStr of selectedDateIds) {
      const dateId = parseInt(dateIdStr);
      if (isNaN(dateId)) continue;
      
      try {
        await pool.query(
          'INSERT INTO available_time_slots (time_slot_id, date_id, time_slot, is_available, max_bookings) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (date_id, time_slot) DO UPDATE SET is_available = $4, max_bookings = $5',
          [nextTimeSlotId, dateId, timeSlot, isAvailable, maxBookings]
        );
        addedCount++;
        nextTimeSlotId++;
      } catch (err) {
        console.error(`Error adding time slot to date ${dateId}:`, err);
      }
    }
    
    res.redirect(`/admin/dates-times?success=${encodeURIComponent('Time slot added to ' + addedCount + ' date(s)')}`);
  } catch (error) {
    console.error('Error bulk adding time slots:', error);
    res.redirect('/admin/dates-times?error=' + encodeURIComponent('Error adding time slots'));
  }
});

// =========================
// ADMIN TESTIMONIALS ROUTES
// =========================

// Add testimonial
app.post('/admin/testimonials/add', requireAuth, async (req, res) => {
  try {
    const { name, quote, is_active, display_order } = req.body;
    
    // Get next testimonial_id
    const maxResult = await pool.query('SELECT MAX(testimonial_id) as max_id FROM testimonials');
    const nextId = maxResult.rows[0]?.max_id ? parseInt(maxResult.rows[0].max_id) + 1 : 1;
    
    await pool.query(
      'INSERT INTO testimonials (testimonial_id, name, quote, is_active, display_order) VALUES ($1, $2, $3, $4, $5)',
      [nextId, name, quote, is_active === 'true', parseInt(display_order) || 0]
    );
    
    res.redirect('/admin/testimonials?success=Testimonial added successfully');
  } catch (error) {
    console.error('Error adding testimonial:', error);
    res.redirect('/admin/testimonials?error=Error adding testimonial');
  }
});

// Update testimonial
app.post('/admin/testimonials/update/:testimonialId', requireAuth, async (req, res) => {
  try {
    const testimonialId = parseInt(req.params.testimonialId);
    const { name, quote, is_active, display_order } = req.body;
    
    await pool.query(
      'UPDATE testimonials SET name = $1, quote = $2, is_active = $3, display_order = $4 WHERE testimonial_id = $5',
      [name, quote, is_active === 'true', parseInt(display_order) || 0, testimonialId]
    );
    
    res.redirect('/admin/testimonials?success=Testimonial updated successfully');
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.redirect('/admin/testimonials?error=Error updating testimonial');
  }
});

// Delete testimonial
app.get('/admin/testimonials/delete/:testimonialId', requireAuth, async (req, res) => {
  try {
    const testimonialId = parseInt(req.params.testimonialId);
    
    await pool.query('DELETE FROM testimonials WHERE testimonial_id = $1', [testimonialId]);
    
    res.redirect('/admin/testimonials?success=Testimonial deleted successfully');
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.redirect('/admin/testimonials?error=Error deleting testimonial');
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
