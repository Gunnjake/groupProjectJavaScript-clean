// All routes - public, auth, CRUD operations
// requireAuth = must be logged in, requireManager = manager role only

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth, requireManager } = require('../middleware/auth');
const db = require('../db');

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Homepage - shows upcoming events
router.get('/', async (req, res) => {
    try {
        const events = await db('EventTemplates')
            .select('*')
            .where('event_date', '>=', new Date())
            .orderBy('event_date', 'asc')
            .limit(5);
        
        res.render('public/landing', {
            title: 'Ella Rises - Empowering the Future Generation of Women',
            description: 'Join Ella Rises in empowering young women through STEAM programs, Ballet Folklorico, Mariachi, and cultural heritage education. Register for programs and events today.',
            user: req.session.user || null,
            events: events || []
        });
    } catch (error) {
        // Render without events if DB fails
        console.error('Error fetching events:', error);
        res.render('public/landing', {
            title: 'Ella Rises - Empowering the Future Generation of Women',
            description: 'Join Ella Rises in empowering young women through STEAM programs, Ballet Folklorico, Mariachi, and cultural heritage education. Register for programs and events today.',
            user: req.session.user || null,
            events: []
        });
    }
});

router.get('/about', (req, res) => {
    res.render('public/about', {
        title: 'About - Ella Rises',
        description: 'Learn about Ella Rises mission to empower the rising generation of women through STEAM programs, mentoring, and cultural heritage education.',
        user: req.session.user || null
    });
});

router.get('/contact', (req, res) => {
    res.render('public/contact', {
        title: 'Contact Us - Ella Rises',
        description: 'Get in touch with the Ella Rises team. We\'d love to hear from you!',
        user: req.session.user || null
    });
});

// Contact form submit
router.post('/contact', (req, res) => {
    // TODO: Save to database
    req.session.messages = [{ type: 'success', text: 'Thank you for contacting us! We will get back to you soon.' }];
    res.redirect('/contact');
});

// Programs carousel - program index from query param
router.get('/programs', (req, res) => {
    const programIndex = parseInt(req.query.program) || 0;
    res.render('public/programs', {
        title: 'Programs - Ella Rises',
        description: 'Explore our programs: Ballet Folklorico, Mariachi, STEAM Workshops, and Ella Rises Summit. Learn more and enroll today.',
        user: req.session.user || null,
        programIndex: programIndex
    });
});

router.get('/register', (req, res) => {
    res.render('public/register', {
        title: 'Register - Ella Rises',
        description: 'Register for Ella Rises programs and create your account. Join us in empowering the future generation of women.',
        user: req.session.user || null
    });
});

// Registration - creates account + participant + registration
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, phone, age, program, city, state, zip, school, password, confirmPassword } = req.body;
    
    try {
        // If already logged in, just register for program
        if (req.session.user) {
            const userId = req.session.user.id;
            // TODO: Save registration to DB
            req.session.messages = [{ 
                type: 'success', 
                text: `Thank you! You've been registered for ${program}.` 
            }];
            return res.redirect('/register');
        }
        
        // Validate password
        if (!password || password.length < 6) {
            req.session.messages = [{ 
                type: 'error', 
                text: 'Password must be at least 6 characters long.' 
            }];
            return res.redirect('/register');
        }
        
        if (password !== confirmPassword) {
            req.session.messages = [{ 
                type: 'error', 
                text: 'Passwords do not match.' 
            }];
            return res.redirect('/register');
        }
        
        // TODO: Create user + participant + registration in DB
        // Create user account
        // const passwordHash = await bcrypt.hash(password, 10);
        // const newUser = await db('Users').insert({
        //     Username: email.split('@')[0],
        //     Email: email,
        //     Password_Hash: passwordHash,
        //     Role: 'user',
        //     FirstName: firstName,
        //     LastName: lastName,
        //     Phone: phone
        // }).returning('*');
        
        // Create participant record
        // const newParticipant = await db('Participants').insert({
        //     ParticipantEmail: email,
        //     ParticipantFirstName: firstName,
        //     ParticipantLastName: lastName,
        //     ParticipantPhone: phone,
        //     ParticipantDOB: new Date().getFullYear() - parseInt(age) + '-01-01',
        //     ParticipantCity: city,
        //     ParticipantState: state,
        //     ParticipantZip: zip,
        //     ParticipantSchoolOrEmployer: school,
        //     ParticipantID: newUser[0].UserID
        // });
        
        // Register for program
        // const programEvent = await db('EventTemplates').where({ EventName: program }).first();
        // if (programEvent) {
        //     await db('Registrations').insert({
        //         ParticipantID: newUser[0].UserID,
        //         EventTemplateID: programEvent.EventTemplateID,
        //         RegistrationDate: new Date()
        //     });
        // }
        
        // Auto-login the new user
        // req.session.user = {
        //     id: newUser[0].UserID,
        //     username: newUser[0].Username,
        //     email: newUser[0].Email,
        //     role: newUser[0].Role,
        //     firstName: firstName,
        //     lastName: lastName
        // };
        
        req.session.messages = [{ 
            type: 'success', 
            text: `Account created successfully! You've been registered for ${program}. You can now login to view your registrations.` 
        }];
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.session.messages = [{ 
            type: 'error', 
            text: 'There was an error processing your registration. Please try again.' 
        }];
        res.redirect('/register');
    }
});

// API - get logged-in user's program registrations
router.get('/api/my-registrations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        // TODO: Query DB when connected
        res.json({ registrations: [] });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ error: 'Error fetching registrations' });
    }
});

// 418 Teapot page
router.get('/teapot', (req, res) => {
    res.status(418).render('public/teapot', {
        title: 'I\'m a Teapot',
        user: req.session.user || null
    });
});

// ============================================================================
// TEST LOGIN (no DB required)
// ============================================================================

router.get('/test-login/admin', (req, res) => {
    req.session.user = {
        id: 999,
        username: 'test-admin',
        role: 'manager',
        email: 'admin@test.com'
    };
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
});

router.get('/test-login/customer', (req, res) => {
    req.session.user = {
        id: 998,
        username: 'test-customer',
        role: 'user',
        email: 'customer@test.com'
    };
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// Login page
router.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    
    res.render('auth/login', {
        title: 'Login - Ella Rises',
        error: req.query.error || null,
        user: null
    });
});

// Login form submission
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('auth/login', {
            title: 'Login - Ella Rises',
            error: 'Please provide both username and password',
            user: null
        });
    }
    
    try {
        // Database authentication
        try {
            const user = await db('Users').where({ username }).first();
            if (!user) {
                return res.render('auth/login', {
                    title: 'Login - Ella Rises',
                    error: 'Invalid username or password',
                    user: null
                });
            }
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.render('auth/login', {
                    title: 'Login - Ella Rises',
                    error: 'Invalid username or password',
                    user: null
                });
            }
            
            req.session.user = {
                id: user.userid,
                username: user.username,
                role: user.role,
                email: user.email
            };
            
            const returnTo = req.session.returnTo || '/dashboard';
            delete req.session.returnTo;
            res.redirect(returnTo);
        } catch (dbError) {
            // If Users table doesn't exist yet, use placeholder authentication
            console.log('Database error (Users table may not exist):', dbError.message);
            
            // Temporary placeholder authentication for development
            // TODO: Remove this when Users table is created in database
            if (!username || !password) {
                return res.render('auth/login', {
                    title: 'Login - Ella Rises',
                    error: 'Please provide both username and password',
                    user: null
                });
            }
            
            // Simple placeholder: username containing "manager" = manager role, otherwise = user role
            req.session.user = {
                id: 1,
                username: username,
                role: username.toLowerCase().includes('manager') ? 'manager' : 'user',
                email: `${username}@example.com`
            };
            
            const returnTo = req.session.returnTo || '/dashboard';
            delete req.session.returnTo;
            res.redirect(returnTo);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login - Ella Rises',
            error: 'An error occurred during login. Please try again.',
            user: null
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// ============================================================================
// DASHBOARD ROUTES (Requires authentication)
// ============================================================================

// Dashboard - different views for manager vs user
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isManager = req.session.user.role === 'manager';
        
        if (isManager) {
            // Manager sees simple dashboard
            res.render('dashboard/index', {
                title: 'Dashboard - Ella Rises',
                user: req.session.user,
                messages: req.session.messages || [],
                registrations: []
            });
        } else {
            // User sees their registrations and surveys
            try {
                const registrations = await db('Registrations')
                    .join('EventTemplates', 'Registrations.EventTemplateID', 'EventTemplates.EventTemplateID')
                    .where({ 'Registrations.ParticipantID': userId })
                    .select('EventTemplates.EventName as program', 'Registrations.RegistrationDate as registrationDate')
                    .orderBy('Registrations.RegistrationDate', 'desc');
                
                const surveys = await db('Surveys')
                    .join('Registrations', 'Surveys.RegistrationID', 'Registrations.RegistrationID')
                    .join('EventTemplates', 'Registrations.EventTemplateID', 'EventTemplates.EventTemplateID')
                    .where({ 'Registrations.ParticipantID': userId })
                    .select('Surveys.*', 'EventTemplates.EventName as eventName')
                    .orderBy('Surveys.SurveySubmissionDate', 'desc');
                
                res.render('dashboard/index', {
                    title: 'Dashboard - Ella Rises',
                    user: req.session.user,
                    messages: req.session.messages || [],
                    registrations: registrations || [],
                    surveys: surveys || []
                });
            } catch (dbError) {
                // Show empty if DB not ready
                console.log('Database error (tables may not exist):', dbError.message);
                res.render('dashboard/index', {
                    title: 'Dashboard - Ella Rises',
                    user: req.session.user,
                    messages: req.session.messages || [],
                    registrations: [],
                    surveys: []
                });
            }
        }
        req.session.messages = [];
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard/index', {
            title: 'Dashboard - Ella Rises',
            user: req.session.user,
            messages: [{ type: 'error', text: 'Error loading dashboard data.' }],
            registrations: [],
            surveys: []
        });
    }
});

// ============================================================================
// USER MAINTENANCE ROUTES (Manager only)
// ============================================================================

router.get('/users', requireAuth, requireManager, async (req, res) => {
    try {
        const users = await db('Users').select('*').orderBy('created_at', 'desc');
        res.render('manager/users', {
            title: 'User Maintenance - Ella Rises',
            user: req.session.user,
            users: users,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching users:', error);
        // If Users table doesn't exist, show empty list
        res.render('manager/users', {
            title: 'User Maintenance - Ella Rises',
            user: req.session.user,
            users: [],
            messages: [{ type: 'error', text: 'Users table not found. Please create the Users table in the database.' }]
        });
        req.session.messages = [];
    }
});

router.get('/users/new', requireAuth, requireManager, (req, res) => {
    res.render('manager/users-form', {
        title: 'Add New User - Ella Rises',
        user: req.session.user,
        userData: null
    });
});

// Create user - hash password before saving
router.post('/users/new', requireAuth, requireManager, async (req, res) => {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password || !role) {
        req.session.messages = [{ type: 'error', text: 'All fields are required.' }];
        return res.redirect('/users/new');
    }
    
    if (role !== 'manager' && role !== 'user') {
        req.session.messages = [{ type: 'error', text: 'Invalid role. Must be "manager" or "user".' }];
        return res.redirect('/users/new');
    }
    
    try {
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        await db('Users').insert({
            username,
            email,
            password_hash,
            role,
            created_at: new Date(),
            updated_at: new Date()
        });
        
        req.session.messages = [{ type: 'success', text: 'User created successfully' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error creating user:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating user. Please try again.' }];
        res.redirect('/users/new');
    }
});

router.get('/users/:id/edit', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;
    try {
        const userData = await db('Users').where({ userid: id }).first();
        if (!userData) {
            req.session.messages = [{ type: 'error', text: 'User not found.' }];
            return res.redirect('/users');
        }
        res.render('manager/users-form', {
            title: 'Edit User - Ella Rises',
            user: req.session.user,
            userData: userData
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading user data.' }];
        res.redirect('/users');
    }
});

// Update user - password optional
router.post('/users/:id/update', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !role) {
        req.session.messages = [{ type: 'error', text: 'Username, email, and role are required.' }];
        return res.redirect(`/users/${id}/edit`);
    }
    
    if (role !== 'manager' && role !== 'user') {
        req.session.messages = [{ type: 'error', text: 'Invalid role. Must be "manager" or "user".' }];
        return res.redirect(`/users/${id}/edit`);
    }
    
    try {
        const updateData = {
            username,
            email,
            role,
            updated_at: new Date()
        };
        
        // Only update password if provided
        if (password && password.trim() !== '') {
            const saltRounds = 10;
            updateData.password_hash = await bcrypt.hash(password, saltRounds);
        }
        
        await db('Users').where({ userid: id }).update(updateData);
        
        req.session.messages = [{ type: 'success', text: 'User updated successfully' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error updating user:', error);
        req.session.messages = [{ type: 'error', text: 'Error updating user. Please try again.' }];
        res.redirect(`/users/${id}/edit`);
    }
});

router.post('/users/:id/delete', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;
    try {
        await db('Users').where({ userid: id }).del();
        req.session.messages = [{ type: 'success', text: 'User deleted successfully' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting user. Please try again.' }];
        res.redirect('/users');
    }
});

// ============================================================================
// PARTICIPANT ROUTES (View: public/common users, CRUD: manager only)
// ============================================================================

// Participants - public view, manager gets CRUD buttons
router.get('/participants', async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/participants' : 'user/participants';
    
    try {
        const participants = await db('Participants').select('*').orderBy('ParticipantID', 'desc');
        res.render(viewPath, {
            title: 'Participants - Ella Rises',
            user: user,
            participants: participants,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.render(viewPath, {
            title: 'Participants - Ella Rises',
            user: user,
            participants: [],
            messages: [{ type: 'error', text: 'Error loading participants.' }]
        });
        req.session.messages = [];
    }
});

// Manager-only routes for participants
router.get('/participants/new', requireAuth, (req, res, next) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied. Manager role required.');
    }
    res.render('manager/participants-form', {
        title: 'Add New Participant - Ella Rises',
        user: req.session.user,
        participantData: null
    });
});

router.post('/participants/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { first_name, last_name, email, phone, program, enrollment_date } = req.body;
    try {
        // TODO: Insert into database
        req.session.messages = [{ type: 'success', text: 'Participant created successfully' }];
        res.redirect('/participants');
    } catch (error) {
        console.error('Error creating participant:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating participant. Please try again.' }];
        res.redirect('/participants/new');
    }
});

router.get('/participants/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: const participantData = await db('participants').where({ id }).first();
        res.render('manager/participants-form', {
            title: 'Edit Participant - Ella Rises',
            user: req.session.user,
            participantData: null
        });
    } catch (error) {
        console.error('Error fetching participant:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading participant data.' }];
        res.redirect('/participants');
    }
});

router.post('/participants/:id/update', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    const { first_name, last_name, email, phone, program, enrollment_date } = req.body;
    try {
        // TODO: Update participant in database
        req.session.messages = [{ type: 'success', text: 'Participant updated successfully' }];
        res.redirect('/participants');
    } catch (error) {
        console.error('Error updating participant:', error);
        req.session.messages = [{ type: 'error', text: 'Error updating participant. Please try again.' }];
        res.redirect(`/participants/${id}/edit`);
    }
});

router.post('/participants/:id/delete', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: await db('participants').where({ id }).del();
        req.session.messages = [{ type: 'success', text: 'Participant deleted successfully' }];
        res.redirect('/participants');
    } catch (error) {
        console.error('Error deleting participant:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting participant. Please try again.' }];
        res.redirect('/participants');
    }
});

// ============================================================================
// EVENT ROUTES (View: public/common users, CRUD: manager only)
// ============================================================================

router.get('/events', async (req, res) => {
    // View-only access for everyone (no login required)
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/events' : 'user/events';
    
    try {
        const events = await db('EventTemplates').select('*').orderBy('EventDate', 'asc');
        res.render(viewPath, {
            title: 'Events - Ella Rises',
            user: user,
            events: events || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching events:', error);
        res.render(viewPath, {
            title: 'Events - Ella Rises',
            user: user,
            events: [],
            messages: [{ type: 'info', text: 'Database not connected. Events will appear here once the database is set up.' }]
        });
        req.session.messages = [];
    }
});

router.get('/events/new', requireAuth, (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    res.render('manager/events-form', {
        title: 'Add New Event - Ella Rises',
        user: req.session.user,
        eventData: null
    });
});

router.post('/events/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { event_name, event_type, event_date, location, description } = req.body;
    try {
        // TODO: Insert into database
        req.session.messages = [{ type: 'success', text: 'Event created successfully' }];
        res.redirect('/events');
    } catch (error) {
        console.error('Error creating event:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating event. Please try again.' }];
        res.redirect('/events/new');
    }
});

router.get('/events/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: const eventData = await db('events').where({ id }).first();
        res.render('manager/events-form', {
            title: 'Edit Event - Ella Rises',
            user: req.session.user,
            eventData: null
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading event data.' }];
        res.redirect('/events');
    }
});

router.post('/events/:id/update', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    const { event_name, event_type, event_date, location, description } = req.body;
    try {
        // TODO: Update event in database
        req.session.messages = [{ type: 'success', text: 'Event updated successfully' }];
        res.redirect('/events');
    } catch (error) {
        console.error('Error updating event:', error);
        req.session.messages = [{ type: 'error', text: 'Error updating event. Please try again.' }];
        res.redirect(`/events/${id}/edit`);
    }
});

router.post('/events/:id/delete', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: await db('events').where({ id }).del();
        req.session.messages = [{ type: 'success', text: 'Event deleted successfully' }];
        res.redirect('/events');
    } catch (error) {
        console.error('Error deleting event:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting event. Please try again.' }];
        res.redirect('/events');
    }
});

// ============================================================================
// SURVEY ROUTES (View: public/common users, CRUD: manager only)
// ============================================================================

// Customer's own surveys page
router.get('/my-surveys', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        try {
            const surveys = await db('Surveys')
                .join('Registrations', 'Surveys.RegistrationID', 'Registrations.RegistrationID')
                .join('EventTemplates', 'Registrations.EventTemplateID', 'EventTemplates.EventTemplateID')
                .where({ 'Registrations.ParticipantID': userId })
                .select('Surveys.*', 'EventTemplates.EventName as eventName')
                .orderBy('Surveys.SurveySubmissionDate', 'desc');
            
            res.render('user/surveys', {
                title: 'My Surveys - Ella Rises',
                user: req.session.user,
                surveys: surveys || [],
                messages: req.session.messages || []
            });
        } catch (dbError) {
            console.log('Database error:', dbError.message);
            res.render('user/surveys', {
                title: 'My Surveys - Ella Rises',
                user: req.session.user,
                surveys: [],
                messages: [{ type: 'info', text: 'Database not connected. Surveys will appear here once the database is set up.' }]
            });
        }
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching user surveys:', error);
        res.render('user/surveys', {
            title: 'My Surveys - Ella Rises',
            user: req.session.user,
            surveys: [],
            messages: [{ type: 'info', text: 'Database not connected. Surveys will appear here once the database is set up.' }]
        });
    }
});

router.get('/surveys', async (req, res) => {
    // Manager-only view - shows all surveys
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    
    if (!isManager) {
        // Redirect customers to their own surveys page
        if (user) {
            return res.redirect('/my-surveys');
        }
        // Not logged in - redirect to login
        return res.redirect('/login');
    }
    
    try {
        const surveys = await db('Surveys')
            .join('Registrations', 'Surveys.RegistrationID', 'Registrations.RegistrationID')
            .join('Participants', 'Registrations.ParticipantID', 'Participants.ParticipantID')
            .select('Surveys.*', 'Participants.ParticipantFirstName', 'Participants.ParticipantLastName')
            .orderBy('Surveys.SurveySubmissionDate', 'desc');
        res.render('manager/surveys', {
            title: 'Post-Event Surveys - Ella Rises',
            user: user,
            surveys: surveys,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.render('manager/surveys', {
            title: 'Post-Event Surveys - Ella Rises',
            user: user,
            surveys: [],
            messages: [{ type: 'error', text: 'Error loading surveys.' }]
        });
        req.session.messages = [];
    }
});

router.get('/surveys/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    // TODO: const participants = await db('participants').select('id', 'first_name', 'last_name');
    // TODO: const events = await db('events').select('id', 'event_name');
    res.render('manager/surveys-form', {
        title: 'Add New Survey - Ella Rises',
        user: req.session.user,
        surveyData: null,
        participants: [],
        events: []
    });
});

router.post('/surveys/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { participant_id, event_id, satisfaction_score, usefulness_score, recommendation_score, comments, survey_date } = req.body;
    try {
        // TODO: Insert into database
        req.session.messages = [{ type: 'success', text: 'Survey created successfully' }];
        res.redirect('/surveys');
    } catch (error) {
        console.error('Error creating survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating survey. Please try again.' }];
        res.redirect('/surveys/new');
    }
});

router.get('/surveys/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: const surveyData = await db('surveys').where({ id }).first();
        // TODO: const participants = await db('participants').select('id', 'first_name', 'last_name');
        // TODO: const events = await db('events').select('id', 'event_name');
        res.render('manager/surveys-form', {
            title: 'Edit Survey - Ella Rises',
            user: req.session.user,
            surveyData: null,
            participants: [],
            events: []
        });
    } catch (error) {
        console.error('Error fetching survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading survey data.' }];
        res.redirect('/surveys');
    }
});

router.post('/surveys/:id/update', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    const { participant_id, event_id, satisfaction_score, usefulness_score, recommendation_score, comments, survey_date } = req.body;
    try {
        // TODO: Update survey in database
        req.session.messages = [{ type: 'success', text: 'Survey updated successfully' }];
        res.redirect('/surveys');
    } catch (error) {
        console.error('Error updating survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error updating survey. Please try again.' }];
        res.redirect(`/surveys/${id}/edit`);
    }
});

router.post('/surveys/:id/delete', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: await db('surveys').where({ id }).del();
        req.session.messages = [{ type: 'success', text: 'Survey deleted successfully' }];
        res.redirect('/surveys');
    } catch (error) {
        console.error('Error deleting survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting survey. Please try again.' }];
        res.redirect('/surveys');
    }
});

// ============================================================================
// MILESTONE ROUTES (View: public/common users, CRUD: manager only)
// ============================================================================

router.get('/milestones', async (req, res) => {
    // View-only access for everyone (no login required)
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/milestones' : 'user/milestones';
    
    try {
        const milestones = await db('Milestones')
            .join('Participants', 'Milestones.ParticipantID', 'Participants.ParticipantID')
            .select('Milestones.*', 'Participants.ParticipantFirstName', 'Participants.ParticipantLastName')
            .orderBy('Milestones.MilestoneDate', 'desc');
        res.render(viewPath, {
            title: 'Milestones - Ella Rises',
            user: user,
            milestones: milestones,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching milestones:', error);
        res.render(viewPath, {
            title: 'Milestones - Ella Rises',
            user: user,
            milestones: [],
            messages: [{ type: 'error', text: 'Error loading milestones.' }]
        });
        req.session.messages = [];
    }
});

router.get('/milestones/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    try {
        // Fetch participants from database for 1-to-many relationship
        const participants = await db('Participants')
            .select('ParticipantID', 'ParticipantFirstName', 'ParticipantLastName')
            .orderBy('ParticipantLastName', 'asc');
        
        res.render('manager/milestones-form', {
            title: 'Add New Milestone - Ella Rises',
            user: req.session.user,
            milestoneData: null,
            participants: participants || []
        });
    } catch (error) {
        console.error('Error fetching participants for milestone:', error);
        res.render('manager/milestones-form', {
            title: 'Add New Milestone - Ella Rises',
            user: req.session.user,
            milestoneData: null,
            participants: []
        });
    }
});

router.post('/milestones/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { milestone_name, milestone_type, participant_id, achievement_date, status, description } = req.body;
    try {
        // TODO: Insert into database
        req.session.messages = [{ type: 'success', text: 'Milestone created successfully' }];
        res.redirect('/milestones');
    } catch (error) {
        console.error('Error creating milestone:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating milestone. Please try again.' }];
        res.redirect('/milestones/new');
    }
});

router.get('/milestones/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        const milestoneData = await db('Milestones').where({ MilestoneID: id }).first();
        
        if (!milestoneData) {
            req.session.messages = [{ type: 'error', text: 'Milestone not found.' }];
            return res.redirect('/milestones');
        }
        
        // Fetch participants for 1-to-many relationship
        const participants = await db('Participants')
            .select('ParticipantID', 'ParticipantFirstName', 'ParticipantLastName')
            .orderBy('ParticipantLastName', 'asc');
        
        res.render('manager/milestones-form', {
            title: 'Edit Milestone - Ella Rises',
            user: req.session.user,
            milestoneData: milestoneData,
            participants: participants || []
        });
    } catch (error) {
        console.error('Error fetching milestone:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading milestone data.' }];
        res.redirect('/milestones');
    }
});

router.post('/milestones/:id/update', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    const { milestone_name, milestone_type, participant_id, achievement_date, status, description } = req.body;
    try {
        // TODO: Update milestone in database
        req.session.messages = [{ type: 'success', text: 'Milestone updated successfully' }];
        res.redirect('/milestones');
    } catch (error) {
        console.error('Error updating milestone:', error);
        req.session.messages = [{ type: 'error', text: 'Error updating milestone. Please try again.' }];
        res.redirect(`/milestones/${id}/edit`);
    }
});

router.post('/milestones/:id/delete', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: await db('milestones').where({ id }).del();
        req.session.messages = [{ type: 'success', text: 'Milestone deleted successfully' }];
        res.redirect('/milestones');
    } catch (error) {
        console.error('Error deleting milestone:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting milestone. Please try again.' }];
        res.redirect('/milestones');
    }
});

// ============================================================================
// VISITOR DONATION ROUTES (Public - No login required)
// ============================================================================

// Visitor donation page - accessible to anyone without login
router.get('/donate', (req, res) => {
    res.render('public/donate', {
        title: 'Donate - Ella Rises',
        description: 'Support Ella Rises by making a donation. Your contribution helps empower the future generation of women.',
        user: req.session.user || null,
        success: false,
        error: null
    });
});

// Visitor donation form submission - no authentication required
router.post('/donate', async (req, res) => {
    const { donor_name, donor_email, donor_phone, amount, payment_method, donation_date, message } = req.body;
    
    // Basic validation
    if (!donor_name || !donor_email || !amount || !payment_method || !donation_date) {
        return res.render('public/donate', {
            title: 'Donate - Ella Rises',
            description: 'Support Ella Rises by making a donation.',
            user: req.session.user || null,
            success: false,
            error: 'Please fill in all required fields.'
        });
    }
    
    // Validate amount
    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount < 1) {
        return res.render('public/donate', {
            title: 'Donate - Ella Rises',
            description: 'Support Ella Rises by making a donation.',
            user: req.session.user || null,
            success: false,
            error: 'Please enter a valid donation amount (minimum $1.00).'
        });
    }
    
    try {
        // Save visitor donation to database
        // Note: Visitor donations don't require a ParticipantID since they're from non-registered donors
        // TODO: When database is connected, insert into Donations table:
        // await db('Donations').insert({
        //     DonorName: donor_name,
        //     DonorEmail: donor_email,
        //     DonorPhone: donor_phone || null,
        //     Amount: donationAmount,
        //     PaymentMethod: payment_method,
        //     DonationDate: donation_date,
        //     Notes: message || null,
        //     ParticipantID: null // Visitor donations don't have a participant
        // });
        
        // For now, just show success message
        res.render('public/donate', {
            title: 'Donate - Ella Rises',
            description: 'Support Ella Rises by making a donation.',
            user: req.session.user || null,
            success: true,
            error: null
        });
    } catch (error) {
        console.error('Error processing donation:', error);
        res.render('public/donate', {
            title: 'Donate - Ella Rises',
            description: 'Support Ella Rises by making a donation.',
            user: req.session.user || null,
            success: false,
            error: 'An error occurred processing your donation. Please try again or contact us directly.'
        });
    }
});

// ============================================================================
// DONATION MAINTENANCE ROUTES (View: public/common users, CRUD: manager only)
// ============================================================================

router.get('/donations', async (req, res) => {
    // View-only access for everyone (no login required)
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/donations' : 'user/donations';
    
    try {
        const donations = await db('Donations')
            .join('Participants', 'Donations.ParticipantID', 'Participants.ParticipantID')
            .select('Donations.*', 'Participants.ParticipantFirstName', 'Participants.ParticipantLastName')
            .orderBy('Donations.DonationDate', 'desc');
        res.render(viewPath, {
            title: 'Donations - Ella Rises',
            user: user,
            donations: donations,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.render(viewPath, {
            title: 'Donations - Ella Rises',
            user: user,
            donations: [],
            messages: [{ type: 'error', text: 'Error loading donations.' }]
        });
        req.session.messages = [];
    }
});

router.get('/donations/new', requireAuth, (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    res.render('manager/donations-form', {
        title: 'Add New Donation - Ella Rises',
        user: req.session.user,
        donationData: null
    });
});

router.post('/donations/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { donor_name, donor_email, donor_phone, amount, payment_method, donation_date, notes } = req.body;
    try {
        // TODO: Insert into database
        req.session.messages = [{ type: 'success', text: 'Donation recorded successfully' }];
        res.redirect('/donations');
    } catch (error) {
        console.error('Error creating donation:', error);
        req.session.messages = [{ type: 'error', text: 'Error recording donation. Please try again.' }];
        res.redirect('/donations/new');
    }
});

router.get('/donations/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: const donationData = await db('donations').where({ id }).first();
        res.render('manager/donations-form', {
            title: 'Edit Donation - Ella Rises',
            user: req.session.user,
            donationData: null
        });
    } catch (error) {
        console.error('Error fetching donation:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading donation data.' }];
        res.redirect('/donations');
    }
});

router.post('/donations/:id/update', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    const { donor_name, donor_email, donor_phone, amount, payment_method, donation_date, notes } = req.body;
    try {
        // TODO: Update donation in database
        req.session.messages = [{ type: 'success', text: 'Donation updated successfully' }];
        res.redirect('/donations');
    } catch (error) {
        console.error('Error updating donation:', error);
        req.session.messages = [{ type: 'error', text: 'Error updating donation. Please try again.' }];
        res.redirect(`/donations/${id}/edit`);
    }
});

router.post('/donations/:id/delete', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // TODO: await db('donations').where({ id }).del();
        req.session.messages = [{ type: 'success', text: 'Donation deleted successfully' }];
        res.redirect('/donations');
    } catch (error) {
        console.error('Error deleting donation:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting donation. Please try again.' }];
        res.redirect('/donations');
    }
});

// 404 Handler - Must be last route
router.use((req, res) => {
    res.status(404).render('public/404', {
        title: '404 - Page Not Found',
        user: req.session.user || null
    });
});

module.exports = router;

