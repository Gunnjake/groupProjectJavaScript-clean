// All routes - public, auth, CRUD operations
// requireAuth = must be logged in, requireManager = manager role only

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth, requireManager } = require('../middleware/auth');
const knex = require('knex');
const knexConfig = require('../knexfile');
const environment = process.env.NODE_ENV || 'development';
const knexInstance = knex(knexConfig[environment]);


// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Health check endpoint - for deployment verification
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8080
    });
});

// Homepage - shows upcoming events
router.get('/', async (req, res) => {
    try {
        // Get upcoming event occurrences (matching FInalTableCreation.sql schema)
        const events = await knexInstance('EventOccurrences')
            .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
            .select(
                'EventOccurrences.EventOccurrenceID as event_id',
                'EventOccurrences.EventName as event_name',
                'EventOccurrences.EventDateTimeStart as event_date',
                'EventOccurrences.EventLocation as location',
                'EventTemplate.EventDescription as description',
                'EventTemplate.EventType as event_type'
            )
            .where('EventOccurrences.EventDateTimeStart', '>=', new Date())
            .orderBy('EventOccurrences.EventDateTimeStart', 'asc')
            .limit(5);
        
        res.render('public/landing', {
            title: 'Ella Rises - Empowering the Future Generation of Women',
            description: 'Join Ella Rises in empowering young women through STEAM programs, Ballet Folklorico, Mariachi, and cultural heritage education. Register for programs and events today.',
            user: req.session.user || null,
            events: events || []
        });
    } catch (error) {
        // Log error and render without events
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
    const { firstName, lastName, email, phone, age, program, city, state, zip, school, fieldOfInterest, birthdate, password, confirmPassword, newsletter } = req.body;
    
    try {
        // If already logged in, just register for program
        if (req.session.user) {
            const userId = req.session.user.id;
            // TODO: Save registration to DB
            
            // Subscribe to newsletter if checked
            // if (newsletter === 'yes') {
            //     try {
            //         await db('NewsletterSubscriptions').insert({
            //             Email: email,
            //             FirstName: firstName,
            //             LastName: lastName,
            //             SubscriptionDate: new Date(),
            //             IsActive: true
            //         }).onConflict('Email').merge({ IsActive: true, SubscriptionDate: new Date() });
            //     } catch (newsletterError) {
            //         console.error('Newsletter subscription error:', newsletterError);
            //     }
            // }
            
            req.session.messages = [{ 
                type: 'success', 
                text: `Thank you! You've been registered for ${program}.` 
            }];
            return res.redirect('/register');
        }
        
        // Validate password exists (any length allowed)
        if (!password) {
            req.session.messages = [{ 
                type: 'error', 
                text: 'Password is required.' 
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
        
        // Create person + participant + registration in DB (matching FInalTableCreation.sql schema)
        // Step 1: Create person record in People table
        // const birthdateValue = birthdate || (age ? new Date(new Date().getFullYear() - parseInt(age), 0, 1) : null);
        // const newPerson = await db('People').insert({
        //     Email: email,
        //     FirstName: firstName,
        //     LastName: lastName,
        //     Birthdate: birthdateValue,
        //     PhoneNumber: phone,
        //     City: city,
        //     State: state,
        //     Zip: zip,
        //     Country: 'USA'
        // }).returning('PersonID');
        // 
        // const personId = newPerson[0].PersonID;
        // 
        // // Step 2: Get or create Participant role
        // let participantRole = await db('Roles').where({ RoleName: 'Participant' }).first();
        // if (!participantRole) {
        //     participantRole = await db('Roles').insert({ RoleName: 'Participant' }).returning('*')[0];
        // }
        // 
        // // Step 3: Assign Participant role to person
        // await db('PeopleRoles').insert({
        //     PersonID: personId,
        //     RoleID: participantRole.RoleID
        // });
        // 
        // // Step 4: Create participant details record
        // const passwordHash = await bcrypt.hash(password, 10);
        // await db('ParticipantDetails').insert({
        //     PersonID: personId,
        //     ParticipantSchoolOrEmployer: school || null,
        //     ParticipantFieldOfInterest: fieldOfInterest || null,
        //     Password: passwordHash,
        //     NewsLetter: newsletter === 'yes' ? 1 : 0
        // });
        // 
        // // Step 5: Find event template for the program
        // const programEvent = await db('EventTemplate').where({ EventName: program }).first();
        // if (programEvent) {
        //     // Find or create an event occurrence for registration
        //     // For now, register to the first upcoming occurrence or create one
        //     let eventOccurrence = await db('EventOccurrences')
        //         .where({ EventTemplateID: programEvent.EventTemplateID })
        //         .where('EventDateTimeStart', '>', new Date())
        //         .orderBy('EventDateTimeStart', 'asc')
        //         .first();
        //     
        //     if (!eventOccurrence) {
        //         // Create a default occurrence if none exists
        //         eventOccurrence = await db('EventOccurrences').insert({
        //             EventTemplateID: programEvent.EventTemplateID,
        //             EventName: program,
        //             EventDateTimeStart: new Date(),
        //             EventDateTimeEnd: new Date(),
        //             EventLocation: 'TBD',
        //             EventCapacity: programEvent.EventDefaultCapacity || 50
        //         }).returning('*')[0];
        //     }
        //     
        //     // Step 6: Create registration
        //     await db('EventRegistrations').insert({
        //         PersonID: personId,
        //         EventOccurrenceID: eventOccurrence.EventOccurrenceID,
        //         RegistrationStatus: 'Registered',
        //         RegistrationAttendedFlag: 0,
        //         RegistrationCreatedAt: new Date()
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
        error_message: req.query.error_message || null,
        user: null
    });
});

// Test login page
router.get('/test-login', (req, res) => {
    res.send(`
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

        <div class="container mt-5" style="max-width: 500px;">
            <h3 class="mb-4 text-center">Test Login</h3>
            <form method="POST" action="/login">
                <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input class="form-control" type="text" name="username" required />
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input class="form-control" type="password" name="password" required />
                </div>
                <button class="btn btn-primary w-100" type="submit">Log In</button>
            </form>
        </div>
    `);
});

// ===============================
// TEST LOGIN QUERY PAGE (GET)
// ===============================
router.get('/test-login-query', async (req, res) => {
    res.render('test/query-test', {
        title: "Query Testing - Ella Rises",
        emailInput: "",
        error: null,
        actualQuery: null,
        results: null
    });
});

// ===============================
// TEST LOGIN QUERY (POST)
// ===============================
router.post('/test-login-query', async (req, res) => {
    const email = req.body.email || '';

    const sql = `
        SELECT
            p.personid,
            p.email,
            p.firstname,
            p.lastname,

            CASE
                WHEN ad.password IS NOT NULL THEN 'Admin'
                WHEN vd.password IS NOT NULL THEN 'Volunteer'
                WHEN pd.password IS NOT NULL THEN 'Participant'
                ELSE 'Unknown'
            END AS detectedRole,

            COALESCE(ad.password, vd.password, pd.password) AS detectedPassword,

            ad.adminrole,
            ad.salary,
            vd.volunteerrole,
            pd.participantschooloremployer,
            pd.participantfieldofinterest,
            pd.newsletter

        FROM people p
        LEFT JOIN admindetails ad ON p.personid = ad.personid
        LEFT JOIN volunteerdetails vd ON p.personid = vd.personid
        LEFT JOIN participantdetails pd ON p.personid = pd.personid
        WHERE p.email = ?
        LIMIT 1
    `;

    try {
        const result = await knexInstance.raw(sql, [email]);
        const rows = result.rows || [];

        res.render('test/query-test', {
            title: "Query Testing - Ella Rises",
            emailInput: email,
            error: null,
            actualQuery: sql.replace("?", `'${email.replace(/'/g, "''")}'`),
            results: {
                emailSearched: email,
                rowCount: rows.length,
                rows
            }
        });

    } catch (err) {
        res.render('test/query-test', {
            title: "Query Testing - Ella Rises",
            emailInput: email,
            error: err.message,
            actualQuery: sql.replace("?", `'${email.replace(/'/g, "''")}'`),
            results: null
        });
    }
});

// Login form submission - using COALESCE with LEFT JOINs
router.post('/login', async (req, res) => {
    const sEmail = req.body.username;
    const sPassword = req.body.password;

    try {
        // Query using role detection based on which detail table has a password
        const sql = `
            SELECT
                p.personid,
                p.email,
                p.firstname,
                p.lastname,

                CASE
                    WHEN ad.password IS NOT NULL THEN 'Admin'
                    WHEN vd.password IS NOT NULL THEN 'Volunteer'
                    WHEN pd.password IS NOT NULL THEN 'Participant'
                    ELSE 'Unknown'
                END AS detectedRole,

                COALESCE(ad.password, vd.password, pd.password) AS detectedPassword,

                ad.adminrole,
                ad.salary,
                vd.volunteerrole,
                pd.participantschooloremployer,
                pd.participantfieldofinterest,
                pd.newsletter

            FROM people p
            LEFT JOIN admindetails ad ON p.personid = ad.personid
            LEFT JOIN volunteerdetails vd ON p.personid = vd.personid
            LEFT JOIN participantdetails pd ON p.personid = pd.personid
            WHERE p.email = ?
            LIMIT 1
        `;

        const result = await knexInstance.raw(sql, [sEmail]);
        const rows = result.rows || [];
        const user = rows.length > 0 ? rows[0] : null;

        if (!user) {
            return res.render("auth/login", { error_message: "Invalid email or password" });
        }

        // Check if password exists
        if (!user.detectedpassword) {
            return res.render("auth/login", { error_message: "Invalid email or password" });
        }

        // Direct string comparison (no bcrypt)
        const match = user.detectedpassword === sPassword;
        
        if (!match) {
            return res.render("auth/login", { error_message: "Invalid email or password" });
        }

        // Build role-specific details object based on detected role
        const roleDetails = {};
        const detectedRole = user.detectedrole ? user.detectedrole.toLowerCase() : 'unknown';
        
        if (detectedRole === 'admin') {
            roleDetails.AdminRole = user.adminrole;
            roleDetails.Salary = user.salary;
        } else if (detectedRole === 'volunteer') {
            roleDetails.VolunteerRole = user.volunteerrole;
        } else if (detectedRole === 'participant') {
            roleDetails.ParticipantSchoolOrEmployer = user.participantschooloremployer;
            roleDetails.ParticipantFieldOfInterest = user.participantfieldofinterest;
            roleDetails.NewsLetter = user.newsletter;
        }

        // Set session data
        req.session.isLoggedIn = true;
        req.session.user = {
            id: user.personid,
            PersonID: user.personid,
            username: user.email,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            role: detectedRole === 'admin' ? 'manager' : 'user',
            RoleName: user.detectedrole,
            RoleDetails: roleDetails
        };

        return res.redirect("/");
    } catch (err) {
        console.error("Login error:", err);
        return res.render("auth/login", { error_message: "System error during login" });
    }
});

// Password setup page - for users without passwords
router.get('/setup-password', (req, res) => {
    // Check if user is in password setup flow
    if (!req.session.setupPasswordUserId) {
        return res.redirect('/login');
    }
    
    res.render('auth/setup-password', {
        title: 'Setup Password - Ella Rises',
        username: req.session.setupPasswordUsername || '',
        email: req.session.setupPasswordEmail || '',
        user: null
    });
});

// Password setup form submission
router.post('/setup-password', async (req, res) => {
    const { password, confirmPassword } = req.body;
    const userId = req.session.setupPasswordUserId;
    const username = req.session.setupPasswordUsername;
    const email = req.session.setupPasswordEmail;
    
    if (!userId) {
        return res.redirect('/login');
    }
    
    // Validate password exists (any length allowed)
    if (!password) {
        return res.render('auth/setup-password', {
            title: 'Setup Password - Ella Rises',
            username: username || '',
            email: email || '',
            error: 'Password is required',
            user: null
        });
    }
    
    if (password !== confirmPassword) {
        return res.render('auth/setup-password', {
            title: 'Setup Password - Ella Rises',
            username: username || '',
            email: email || '',
            error: 'Passwords do not match',
            user: null
        });
    }
    
    try {
        // Hash password and save to database (matching FInalTableCreation.sql schema)
        // Determine which detail table to update based on user's roles
        // const passwordHash = await bcrypt.hash(password, 10);
        // 
        // // Get person's roles
        // const personRoles = await db('PeopleRoles')
        //     .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
        //     .where({ PersonID: userId })
        //     .select('Roles.RoleName');
        // 
        // const roleNames = personRoles.map(r => (r.RoleName || r.rolename || '').toLowerCase());
        // 
        // // Update password in appropriate detail table
        // if (roleNames.includes('admin')) {
        //     // Update AdminDetails
        //     await db('AdminDetails')
        //         .where({ PersonID: userId })
        //         .update({ Password: passwordHash });
        // } else if (roleNames.includes('participant')) {
        //     // Update ParticipantDetails
        //     await db('ParticipantDetails')
        //         .where({ PersonID: userId })
        //         .update({ Password: passwordHash });
        // } else if (roleNames.includes('volunteer')) {
        //     // Update VolunteerDetails
        //     await db('VolunteerDetails')
        //         .where({ PersonID: userId })
        //         .update({ Password: passwordHash });
        // }
        
        // Clear setup session variables
        delete req.session.setupPasswordUserId;
        delete req.session.setupPasswordUsername;
        delete req.session.setupPasswordEmail;
        
        req.session.messages = [{
            type: 'success',
            text: 'Password set successfully! You can now login with your username and password.'
        }];
        
        res.redirect('/login');
    } catch (error) {
        console.error('Password setup error:', error);
        res.render('auth/setup-password', {
            title: 'Setup Password - Ella Rises',
            username: username || '',
            email: email || '',
            error: 'An error occurred while setting up your password. Please try again.',
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
            // User sees their registrations and surveys (matching FInalTableCreation.sql schema)
            try {
                const registrations = await knexInstance('EventRegistrations')
                    .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
                    .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
                    .where({ 'EventRegistrations.PersonID': userId })
                    .select('EventTemplate.EventName as program', 'EventRegistrations.RegistrationCreatedAt as registrationDate')
                    .orderBy('EventRegistrations.RegistrationCreatedAt', 'desc');
                
                const surveys = await knexInstance('Surveys')
                    .join('EventRegistrations', 'Surveys.RegistrationID', 'EventRegistrations.RegistrationID')
                    .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
                    .where({ 'EventRegistrations.PersonID': userId })
                    .select('Surveys.*', 'EventOccurrences.EventName as eventName')
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

router.get('/newsletter', requireAuth, requireManager, async (req, res) => {
    try {
        // Get newsletter subscribers from ParticipantDetails (matching FInalTableCreation.sql schema)
        // NewsLetter field is 1 for subscribed, 0 for not subscribed
        const subscribers = await knexInstance('ParticipantDetails')
            .join('People', 'ParticipantDetails.PersonID', 'People.PersonID')
            .where('ParticipantDetails.NewsLetter', 1)
            .select(
                'People.Email',
                'People.FirstName',
                'People.LastName',
                'People.PersonID'
            )
            .orderBy('People.PersonID', 'desc');
        
        res.render('manager/newsletter', {
            title: 'Newsletter Subscribers - Ella Rises',
            user: req.session.user,
            subscribers: subscribers || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching newsletter subscribers:', error);
        res.render('manager/newsletter', {
            title: 'Newsletter Subscribers - Ella Rises',
            user: req.session.user,
            subscribers: [],
            messages: [{ type: 'info', text: 'Database not connected. Newsletter subscribers will appear here once the database is set up.' }]
        });
        req.session.messages = [];
    }
});

router.get('/users', requireAuth, requireManager, async (req, res) => {
    try {
        // Get search query parameter
        const searchQuery = req.query.q || '';
        
        // Base query for people with roles
        let peopleQuery = knexInstance('People')
            .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .select(
                'People.PersonID',
                'People.Email',
                'People.FirstName',
                'People.LastName',
                'People.PhoneNumber',
                'People.City',
                'People.State',
                'Roles.RoleName'
            )
            .where(function() {
                this.where('Roles.RoleName', 'Admin')
                    .orWhere('Roles.RoleName', 'Volunteer');
            })
            .orderBy('People.LastName', 'asc');
        
        // Apply search filter if provided (case-insensitive)
        if (searchQuery) {
            peopleQuery = peopleQuery.where(function() {
                this.whereRaw('People.FirstName ILIKE ?', [`%${searchQuery}%`])
                    .orWhereRaw('People.LastName ILIKE ?', [`%${searchQuery}%`])
                    .orWhereRaw('People.Email ILIKE ?', [`%${searchQuery}%`]);
            });
        }
        
        const peopleWithRoles = await peopleQuery;
        
        // Separate into admins and volunteers
        // If a person has both roles, they appear in both tables
        const admins = [];
        const volunteers = [];
        const adminPersonIds = new Set();
        const volunteerPersonIds = new Set();
        
        peopleWithRoles.forEach(row => {
            const personId = row.PersonID || row.personid;
            const roleName = (row.RoleName || row.rolename || '').toLowerCase();
            const personData = {
                PersonID: row.PersonID,
                Email: row.Email,
                FirstName: row.FirstName,
                LastName: row.LastName,
                PhoneNumber: row.PhoneNumber,
                City: row.City,
                State: row.State
            };
            
            if (roleName === 'admin' && !adminPersonIds.has(personId)) {
                admins.push(personData);
                adminPersonIds.add(personId);
            }
            
            if (roleName === 'volunteer' && !volunteerPersonIds.has(personId)) {
                volunteers.push(personData);
                volunteerPersonIds.add(personId);
            }
        });
        
        res.render('manager/users', {
            title: 'User Maintenance - Ella Rises',
            user: req.session.user,
            admins: admins || [],
            volunteers: volunteers || [],
            searchQuery: searchQuery,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('manager/users', {
            title: 'User Maintenance - Ella Rises',
            user: req.session.user,
            admins: [],
            volunteers: [],
            searchQuery: req.query.q || '',
            messages: [{ type: 'info', text: 'Database not connected. Users will appear here once the database is set up.' }]
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
        
        await knexInstance('Users').insert({
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
        const userData = await knexInstance('Users').where({ userid: id }).first();
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
        
        await knexInstance('Users').where({ userid: id }).update(updateData);
        
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
        await knexInstance('Users').where({ userid: id }).del();
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
router.get('/participants', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/participants' : 'user/participants';
    
    try {
        // Get participants with latest milestone in ONE optimized query
        const participants = await knexInstance('People as p')
            .join('PeopleRoles', 'p.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .join('ParticipantDetails', 'p.PersonID', 'ParticipantDetails.PersonID')
            .where('Roles.RoleName', 'Participant')
            .select(
                'p.PersonID',
                'p.FirstName',
                'p.LastName',
                'p.Email',
                'p.PhoneNumber',
                'p.City',
                'p.State',
                'ParticipantDetails.NewsLetter',
                knexInstance.raw(`
                    (
                        SELECT m2.MilestoneTitle
                        FROM Milestones m2
                        WHERE m2.PersonID = p.PersonID
                        ORDER BY m2.MilestoneDate DESC
                        LIMIT 1
                    ) AS latest_milestone
                `)
            )
            .orderBy('p.LastName', 'asc');
        
        res.render(viewPath, {
            title: 'Participants - Ella Rises',
            user: user,
            participants: participants || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.render(viewPath, {
            title: 'Participants - Ella Rises',
            user: user,
            participants: [],
            messages: [{ type: 'info', text: 'Database not connected. Participants will appear here once the database is set up.' }]
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
    
    // Validate required fields
    if (!first_name || !last_name || !email) {
        req.session.messages = [{ type: 'error', text: 'First name, last name, and email are required.' }];
        return res.redirect('/participants/new');
    }
    
    try {
        // Step 1: Insert into People table
        const [newPerson] = await knexInstance('People')
            .insert({
                FirstName: first_name,
                LastName: last_name,
                Email: email,
                PhoneNumber: phone || null
            })
            .returning('PersonID');
        
        const personId = newPerson.PersonID || newPerson.personid;
        
        // Step 2: Get Participant RoleID
        const participantRole = await knexInstance('Roles')
            .where('RoleName', 'Participant')
            .first();
        
        if (!participantRole) {
            throw new Error('Participant role not found in database');
        }
        
        const roleId = participantRole.RoleID || participantRole.roleid;
        
        // Step 3: Insert into PeopleRoles
        await knexInstance('PeopleRoles')
            .insert({
                PersonID: personId,
                RoleID: roleId
            });
        
        // Step 4: Insert into ParticipantDetails
        await knexInstance('ParticipantDetails')
            .insert({
                PersonID: personId,
                ParticipantSchoolOrEmployer: program || null,
                ParticipantFieldOfInterest: null,
                Password: null,
                NewsLetter: 0
            });
        
        req.session.messages = [{ type: 'success', text: 'Participant created successfully' }];
        res.redirect('/participants');
    } catch (error) {
        console.error('Error creating participant:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating participant: ' + error.message }];
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

router.get('/events', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/events' : 'user/events';
    
    // Get filter from query parameter (future or past, default to future)
    const filter = req.query.filter || 'future';
    
    try {
        // Base query with joins - group by EventName
        let query = knexInstance('EventOccurrences')
            .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
            .select(
                'EventOccurrences.EventName',
                'EventTemplate.EventType',
                knexInstance.raw('COUNT(DISTINCT EventOccurrences.EventOccurrenceID) as occurrence_count'),
                knexInstance.raw('MIN(EventOccurrences.EventDateTimeStart) as earliest_date'),
                knexInstance.raw('MAX(EventOccurrences.EventDateTimeStart) as latest_date'),
                knexInstance.raw('array_agg(DISTINCT EventOccurrences.EventLocation) as locations')
            );
        
        // Apply time-based filter
        const now = knexInstance.fn.now();
        if (filter === 'future') {
            query = query.where('EventOccurrences.EventDateTimeStart', '>=', now);
        } else if (filter === 'past') {
            query = query.where('EventOccurrences.EventDateTimeStart', '<', now);
        }
        
        const groupedEvents = await query
            .groupBy('EventOccurrences.EventName', 'EventTemplate.EventType')
            .orderBy('EventOccurrences.EventName', 'asc');
        
        // Get total participant counts for each event name
        const eventsWithCounts = await Promise.all(groupedEvents.map(async (event) => {
            // Get all occurrences for this event name
            let occurrenceQuery = knexInstance('EventOccurrences')
                .where('EventOccurrences.EventName', event.EventName || event.eventname)
                .select('EventOccurrences.EventOccurrenceID');
            
            if (filter === 'future') {
                occurrenceQuery = occurrenceQuery.where('EventOccurrences.EventDateTimeStart', '>=', now);
            } else if (filter === 'past') {
                occurrenceQuery = occurrenceQuery.where('EventOccurrences.EventDateTimeStart', '<', now);
            }
            
            const occurrences = await occurrenceQuery;
            const occurrenceIds = occurrences.map(o => o.EventOccurrenceID || o.eventoccurrenceid);
            
            // Count total participants across all occurrences
            let totalParticipants = 0;
            if (occurrenceIds.length > 0) {
                const participantCount = await knexInstance('EventRegistrations')
                    .whereIn('EventOccurrenceID', occurrenceIds)
                    .count('RegistrationID as count')
                    .first();
                totalParticipants = participantCount ? (parseInt(participantCount.count) || 0) : 0;
            }
            
            // Determine if event is past (check earliest date)
            const earliestDate = event.earliest_date || event.earliest_date;
            const isPast = earliestDate ? new Date(earliestDate) < new Date() : false;
            
            // Format locations array
            const locations = Array.isArray(event.locations) ? event.locations.filter(l => l) : [];
            const locationDisplay = locations.length > 0 ? locations.join(', ') : 'TBA';
            
            return {
                EventName: event.EventName || event.eventname,
                EventType: event.EventType || event.event_type || 'N/A',
                participantCount: totalParticipants,
                occurrenceCount: parseInt(event.occurrence_count) || 1,
                earliestDate: earliestDate,
                latestDate: event.latest_date || event.latest_date,
                location: locationDisplay,
                isPast: isPast
            };
        }));
        
        res.render(viewPath, {
            title: 'Events - Ella Rises',
            user: user,
            events: eventsWithCounts || [],
            filter: filter,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching events:', error);
        res.render(viewPath, {
            title: 'Events - Ella Rises',
            user: user,
            events: [],
            filter: filter,
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
    
    // Validate required fields
    if (!event_name || !event_type || !event_date || !location) {
        req.session.messages = [{ type: 'error', text: 'Event name, type, date, and location are required.' }];
        return res.redirect('/events/new');
    }
    
    try {
        // Step 1: Create or get EventTemplate
        let eventTemplate = await knexInstance('EventTemplate')
            .where('EventName', event_name)
            .where('EventType', event_type)
            .first();
        
        if (!eventTemplate) {
            try {
                const [newTemplate] = await knexInstance('EventTemplate')
                    .insert({
                        EventName: event_name,
                        EventType: event_type,
                        EventDescription: description || null,
                        EventDefaultCapacity: null
                    })
                    .returning('EventTemplateID');
                eventTemplate = newTemplate;
            } catch (insertError) {
                // If insert fails due to sequence issue, reset sequence and retry
                if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                    // Get max ID and reset sequence
                    const maxIdResult = await knexInstance('EventTemplate')
                        .max('EventTemplateID as max_id')
                        .first();
                    
                    const maxId = maxIdResult?.max_id || 0;
                    await knexInstance.raw(`SELECT setval('eventtemplate_eventtemplateid_seq', ${maxId}, true)`);
                    
                    // Try insert again
                    const [newTemplate] = await knexInstance('EventTemplate')
                        .insert({
                            EventName: event_name,
                            EventType: event_type,
                            EventDescription: description || null,
                            EventDefaultCapacity: null
                        })
                        .returning('EventTemplateID');
                    eventTemplate = newTemplate;
                } else {
                    // If it's a different error, check if template was created by another process
                    eventTemplate = await knexInstance('EventTemplate')
                        .where('EventName', event_name)
                        .where('EventType', event_type)
                        .first();
                    
                    if (!eventTemplate) {
                        throw insertError; // Re-throw if we can't recover
                    }
                }
            }
        }
        
        const templateId = eventTemplate.EventTemplateID || eventTemplate.eventtemplateid;
        
        // Step 2: Create EventOccurrence
        const eventDateTimeStart = new Date(event_date);
        await knexInstance('EventOccurrences')
            .insert({
                EventTemplateID: templateId,
                EventName: event_name,
                EventDateTimeStart: eventDateTimeStart,
                EventLocation: location,
                EventCapacity: null,
                EventRegistrationDeadline: null
            });
        
        req.session.messages = [{ type: 'success', text: 'Event created successfully' }];
        res.redirect('/events');
    } catch (error) {
        console.error('Error creating event:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating event: ' + error.message }];
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
            // Get events user attended that have survey templates
            const registrations = await knexInstance('EventRegistrations')
                .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
                .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
                .where({ 'EventRegistrations.PersonID': userId })
                .where('EventRegistrations.RegistrationAttendedFlag', 1)
                .select(
                    'EventOccurrences.EventOccurrenceID',
                    'EventOccurrences.EventName',
                    'EventOccurrences.EventDateTimeStart',
                    'EventOccurrences.EventLocation',
                    'EventTemplate.EventDescription',
                    'EventRegistrations.RegistrationID'
                )
                .orderBy('EventOccurrences.EventDateTimeStart', 'desc');
            
            // Check which events have surveys already filled out
            const completedSurveys = await knexInstance('Surveys')
                .join('EventRegistrations', 'Surveys.RegistrationID', 'EventRegistrations.RegistrationID')
                .where({ 'EventRegistrations.PersonID': userId })
                .select('EventRegistrations.RegistrationID', 'Surveys.*');
            
            const completedRegistrationIds = new Set(
                completedSurveys.map(s => s.RegistrationID || s.registrationid)
            );
            
            // Extract survey questions from EventDescription
            const eventsWithSurveys = registrations.map(reg => {
                const desc = reg.EventDescription || reg.eventdescription || '';
                const templateMatch = desc.match(/<!--SURVEY_TEMPLATE:(.+?)-->/);
                let questions = [];
                
                if (templateMatch) {
                    try {
                        const templateData = JSON.parse(templateMatch[1]);
                        questions = templateData.surveyQuestions || [];
                    } catch (e) {
                        console.error('Error parsing survey template:', e);
                    }
                }
                
                const hasCompleted = completedRegistrationIds.has(reg.RegistrationID || reg.registrationid);
                
                return {
                    EventOccurrenceID: reg.EventOccurrenceID || reg.eventoccurrenceid,
                    EventName: reg.EventName || reg.eventname,
                    EventDateTimeStart: reg.EventDateTimeStart || reg.eventdatetimestart,
                    EventLocation: reg.EventLocation || reg.eventlocation,
                    RegistrationID: reg.RegistrationID || reg.registrationid,
                    questions: questions,
                    hasSurveyTemplate: questions.length > 0,
                    hasCompleted: hasCompleted,
                    completedSurvey: hasCompleted ? completedSurveys.find(s => (s.RegistrationID || s.registrationid) === (reg.RegistrationID || reg.registrationid)) : null
                };
            }).filter(e => e.hasSurveyTemplate); // Only show events with survey templates
            
            res.render('user/surveys', {
                title: 'My Surveys - Ella Rises',
                user: req.session.user,
                eventsWithSurveys: eventsWithSurveys || [],
                messages: req.session.messages || []
            });
        } catch (dbError) {
            console.log('Database error:', dbError.message);
            res.render('user/surveys', {
                title: 'My Surveys - Ella Rises',
                user: req.session.user,
                eventsWithSurveys: [],
                messages: [{ type: 'info', text: 'Database not connected. Surveys will appear here once the database is set up.' }]
            });
        }
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching user surveys:', error);
        res.render('user/surveys', {
            title: 'My Surveys - Ella Rises',
            user: req.session.user,
            eventsWithSurveys: [],
            messages: [{ type: 'info', text: 'Database not connected. Surveys will appear here once the database is set up.' }]
        });
    }
});

router.get('/surveys', async (req, res) => {
    // Manager-only view - shows all surveys grouped by event name (ignoring dates)
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
        // Group surveys by EventName (ignoring dates), aggregate dates
        const surveyGroups = await knexInstance('Surveys')
            .join('EventRegistrations', 'Surveys.RegistrationID', 'EventRegistrations.RegistrationID')
            .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
            .select(
                'EventOccurrences.EventName',
                knexInstance.raw('COUNT(Surveys.SurveyID) as survey_count'),
                knexInstance.raw('AVG(Surveys.SurveySatisfactionScore) as avg_satisfaction'),
                knexInstance.raw('AVG(Surveys.SurveyUsefulnessScore) as avg_usefulness'),
                knexInstance.raw('AVG(Surveys.SurveyRecommendationScore) as avg_recommendation'),
                knexInstance.raw('AVG(Surveys.SurveyOverallScore) as avg_overall'),
                knexInstance.raw("array_agg(DISTINCT EventOccurrences.EventDateTimeStart::text) as available_dates")
            )
            .groupBy('EventOccurrences.EventName')
            .orderBy('EventOccurrences.EventName', 'asc');
        
        // Process dates array for each group - sort dates in JavaScript
        const processedGroups = surveyGroups.map(group => {
            let dates = Array.isArray(group.available_dates) ? group.available_dates : (group.available_dates ? [group.available_dates] : []);
            // Sort dates descending (newest first)
            dates = dates.sort((a, b) => {
                const dateA = new Date(a);
                const dateB = new Date(b);
                return dateB - dateA; // Descending order
            });
            
            return {
                eventName: group.EventName || group.eventname,
                survey_count: parseInt(group.survey_count) || 0,
                avg_satisfaction: group.avg_satisfaction ? parseFloat(group.avg_satisfaction) : null,
                avg_usefulness: group.avg_usefulness ? parseFloat(group.avg_usefulness) : null,
                avg_recommendation: group.avg_recommendation ? parseFloat(group.avg_recommendation) : null,
                avg_overall: group.avg_overall ? parseFloat(group.avg_overall) : null,
                dates: dates
            };
        });
        
        res.render('manager/surveys', {
            title: 'Post-Event Surveys - Ella Rises',
            user: user,
            surveyGroups: processedGroups || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.render('manager/surveys', {
            title: 'Post-Event Surveys - Ella Rises',
            user: user,
            surveyGroups: [],
            messages: [{ type: 'error', text: 'Error loading surveys.' }]
        });
        req.session.messages = [];
    }
});

router.get('/surveys/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    
    try {
        // Fetch events that don't have surveys yet - ONLY these
        // Get all event occurrences
        const allEvents = await knexInstance('EventOccurrences')
            .select(
                'EventOccurrences.EventOccurrenceID',
                'EventOccurrences.EventName',
                'EventOccurrences.EventDateTimeStart',
                'EventOccurrences.EventLocation'
            )
            .orderBy('EventOccurrences.EventDateTimeStart', 'desc');
        
        // Get events that already have surveys
        const eventsWithSurveys = await knexInstance('Surveys')
            .join('EventRegistrations', 'Surveys.RegistrationID', 'EventRegistrations.RegistrationID')
            .select('EventRegistrations.EventOccurrenceID')
            .distinct();
        
        const eventsWithSurveysIds = new Set(
            eventsWithSurveys.map(e => e.EventOccurrenceID || e.eventoccurrenceid)
        );
        
        // Only events without surveys
        const eventsWithoutSurveys = [];
        
        allEvents.forEach(event => {
            const eventId = event.EventOccurrenceID || event.eventoccurrenceid;
            const eventName = event.EventName || event.eventname;
            const eventDate = event.EventDateTimeStart || event.eventdatetimestart;
            const eventLocation = event.EventLocation || event.eventlocation;
            
            if (!eventsWithSurveysIds.has(eventId)) {
                const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString() : '';
                const displayName = `${eventName}${formattedDate ? ' - ' + formattedDate : ''}${eventLocation ? ' (' + eventLocation + ')' : ''}`;
                
                eventsWithoutSurveys.push({
                    EventOccurrenceID: eventId,
                    displayName: displayName,
                    EventName: eventName,
                    EventDateTimeStart: eventDate,
                    EventLocation: eventLocation
                });
            }
        });
        
        res.render('manager/surveys-form', {
            title: 'Create Survey Template - Ella Rises',
            user: req.session.user,
            surveyData: null,
            events: eventsWithoutSurveys || []
        });
    } catch (error) {
        console.error('Error fetching data for survey form:', error);
        res.render('manager/surveys-form', {
            title: 'Create Survey Template - Ella Rises',
            user: req.session.user,
            surveyData: null,
            events: []
        });
    }
});

router.post('/surveys/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { event_id, questions } = req.body;
    
    // Validate required fields
    if (!event_id || !questions || !Array.isArray(questions) || questions.length === 0) {
        req.session.messages = [{ type: 'error', text: 'Event and at least one question are required.' }];
        return res.redirect('/surveys/new');
    }
    
    // Filter out empty questions
    const validQuestions = questions.filter(q => q && q.trim() !== '');
    
    if (validQuestions.length === 0) {
        req.session.messages = [{ type: 'error', text: 'At least one valid question is required.' }];
        return res.redirect('/surveys/new');
    }
    
    try {
        // Store survey template questions as JSON in EventTemplate or create a survey template record
        // For now, we'll store it in EventOccurrences metadata or create a simple mapping
        // Since we don't have a SurveyTemplates table, we'll store questions in the first survey's comments
        // as a template marker, or we can create a simple text file approach
        
        // Get the event occurrence
        const eventOccurrence = await knexInstance('EventOccurrences')
            .where('EventOccurrenceID', event_id)
            .first();
        
        if (!eventOccurrence) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect('/surveys/new');
        }
        
        // Store questions as JSON - we'll use this when users fill out surveys
        // For now, create a "template" survey with questions stored in comments as JSON
        // In a real system, you'd have a SurveyTemplates table
        
        // Create a survey template record (stored as JSON in comments field for now)
        // This marks that a survey template exists for this event
        const questionsJson = JSON.stringify(validQuestions);
        
        // Store in EventTemplate's EventDescription or create a marker
        // Actually, let's store it in a way we can retrieve it later
        // We'll create a special "template" survey with RegistrationID = -1 or use a different approach
        
        // For now, store questions in EventTemplate description as JSON
        const eventTemplate = await knexInstance('EventTemplate')
            .where('EventTemplateID', eventOccurrence.EventTemplateID || eventOccurrence.eventtemplateid)
            .first();
        
        if (eventTemplate) {
            // Store survey questions in EventDescription as JSON (append to existing description)
            const existingDesc = eventTemplate.EventDescription || '';
            const surveyTemplateData = {
                surveyQuestions: validQuestions,
                createdAt: new Date().toISOString()
            };
            
            // Store in a way we can retrieve - append JSON to description
            const surveyTemplateJson = '\n<!--SURVEY_TEMPLATE:' + JSON.stringify(surveyTemplateData) + '-->';
            await knexInstance('EventTemplate')
                .where('EventTemplateID', eventTemplate.EventTemplateID || eventTemplate.eventtemplateid)
                .update({
                    EventDescription: existingDesc + surveyTemplateJson
                });
        }
        
        req.session.messages = [{ type: 'success', text: 'Survey template created successfully. Users who attended this event can now fill it out.' }];
        res.redirect('/surveys');
    } catch (error) {
        console.error('Error creating survey template:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating survey template: ' + error.message }];
        res.redirect('/surveys/new');
    }
});

// User route to fill out survey for an event
router.get('/surveys/:eventId/fill', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const { eventId } = req.params;
    
    try {
        // Get event and check if user attended
        const registration = await knexInstance('EventRegistrations')
            .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
            .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
            .where('EventRegistrations.PersonID', userId)
            .where('EventRegistrations.EventOccurrenceID', eventId)
            .where('EventRegistrations.RegistrationAttendedFlag', 1)
            .select(
                'EventOccurrences.*',
                'EventTemplate.EventDescription',
                'EventRegistrations.RegistrationID'
            )
            .first();
        
        if (!registration) {
            req.session.messages = [{ type: 'error', text: 'Event not found or you did not attend this event.' }];
            return res.redirect('/my-surveys');
        }
        
        // Check if already completed
        const existingSurvey = await knexInstance('Surveys')
            .where('RegistrationID', registration.RegistrationID || registration.registrationid)
            .first();
        
        if (existingSurvey) {
            req.session.messages = [{ type: 'info', text: 'You have already completed this survey.' }];
            return res.redirect('/my-surveys');
        }
        
        // Extract survey questions
        const desc = registration.EventDescription || registration.eventdescription || '';
        const templateMatch = desc.match(/<!--SURVEY_TEMPLATE:(.+?)-->/);
        let questions = [];
        
        if (templateMatch) {
            try {
                const templateData = JSON.parse(templateMatch[1]);
                questions = templateData.surveyQuestions || [];
            } catch (e) {
                console.error('Error parsing survey template:', e);
            }
        }
        
        if (questions.length === 0) {
            req.session.messages = [{ type: 'error', text: 'Survey template not found for this event.' }];
            return res.redirect('/my-surveys');
        }
        
        res.render('user/fill-survey', {
            title: 'Fill Out Survey - Ella Rises',
            user: req.session.user,
            event: {
                EventOccurrenceID: registration.EventOccurrenceID || registration.eventoccurrenceid,
                EventName: registration.EventName || registration.eventname,
                EventLocation: registration.EventLocation || registration.eventlocation,
                EventDateTimeStart: registration.EventDateTimeStart || registration.eventdatetimestart
            },
            questions: questions,
            registrationId: registration.RegistrationID || registration.registrationid
        });
    } catch (error) {
        console.error('Error loading survey form:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading survey form.' }];
        res.redirect('/my-surveys');
    }
});

// User route to submit survey
router.post('/surveys/:eventId/submit', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const { eventId } = req.params;
    const { answers, comments } = req.body;
    
    try {
        // Get registration
        const registration = await knexInstance('EventRegistrations')
            .where('PersonID', userId)
            .where('EventOccurrenceID', eventId)
            .where('RegistrationAttendedFlag', 1)
            .first();
        
        if (!registration) {
            req.session.messages = [{ type: 'error', text: 'Registration not found.' }];
            return res.redirect('/my-surveys');
        }
        
        // Check if already completed
        const existingSurvey = await knexInstance('Surveys')
            .where('RegistrationID', registration.RegistrationID || registration.registrationid)
            .first();
        
        if (existingSurvey) {
            req.session.messages = [{ type: 'error', text: 'You have already completed this survey.' }];
            return res.redirect('/my-surveys');
        }
        
        // Parse answers (they come as array)
        const answerArray = Array.isArray(answers) ? answers : [answers];
        const scores = answerArray.map(a => parseFloat(a) || 0).filter(s => s > 0);
        
        if (scores.length === 0) {
            req.session.messages = [{ type: 'error', text: 'Please answer at least one question.' }];
            return res.redirect(`/surveys/${eventId}/fill`);
        }
        
        // Map answers to survey fields (first 3-5 questions map to standard fields)
        const satisfactionScore = scores[0] || null;
        const usefulnessScore = scores[1] || null;
        const recommendationScore = scores[2] || null;
        const instructorScore = scores[3] || null;
        const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Create survey
        await knexInstance('Surveys')
            .insert({
                RegistrationID: registration.RegistrationID || registration.registrationid,
                SurveySatisfactionScore: satisfactionScore,
                SurveyUsefulnessScore: usefulnessScore,
                SurveyInstructorScore: instructorScore,
                SurveyRecommendationScore: recommendationScore,
                SurveyOverallScore: overallScore,
                SurveyComments: comments || null,
                SurveySubmissionDate: new Date()
            });
        
        req.session.messages = [{ type: 'success', text: 'Survey submitted successfully! Thank you for your feedback.' }];
        res.redirect('/my-surveys');
    } catch (error) {
        console.error('Error submitting survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error submitting survey: ' + error.message }];
        res.redirect(`/surveys/${eventId}/fill`);
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

router.get('/milestones', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/milestones' : 'user/milestones';
    
    try {
        let milestones;
        
        if (isManager) {
            // Managers see aggregated milestones by type (only for participants)
            milestones = await knexInstance('Milestones')
                .join('People', 'Milestones.PersonID', 'People.PersonID')
                .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
                .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
                .where('Roles.RoleName', 'Participant')
                .select(
                    'Milestones.MilestoneTitle',
                    knexInstance.raw('COUNT(DISTINCT Milestones.PersonID) as count_participants')
                )
                .groupBy('Milestones.MilestoneTitle')
                .orderBy('Milestones.MilestoneTitle', 'asc');
        } else {
            // Regular users see only their own milestones
            const userId = user.id;
            milestones = await knexInstance('Milestones')
                .join('People', 'Milestones.PersonID', 'People.PersonID')
                .where('Milestones.PersonID', userId)
                .select('Milestones.*', 'People.FirstName', 'People.LastName')
                .orderBy('Milestones.MilestoneDate', 'desc');
        }
        
        res.render(viewPath, {
            title: 'Milestones - Ella Rises',
            user: user,
            milestones: milestones || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching milestones:', error);
        res.render(viewPath, {
            title: 'Milestones - Ella Rises',
            user: user,
            milestones: [],
            messages: [{ type: 'info', text: 'Database not connected. Milestones will appear here once the database is set up.' }]
        });
        req.session.messages = [];
    }
});

router.get('/milestones/new', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    try {
        // Fetch participants from database (matching FInalTableCreation.sql schema)
        const participants = await knexInstance('People')
            .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .where('Roles.RoleName', 'Participant')
            .select('People.PersonID', 'People.FirstName', 'People.LastName', 'People.Email')
            .orderBy('People.LastName', 'asc');
        
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
    
    // Validate required fields
    if (!milestone_name || !participant_id || !achievement_date) {
        req.session.messages = [{ type: 'error', text: 'Milestone name, participant, and achievement date are required.' }];
        return res.redirect('/milestones/new');
    }
    
    // Validate participant_id is a valid number
    const personId = parseInt(participant_id);
    if (isNaN(personId) || personId <= 0) {
        req.session.messages = [{ type: 'error', text: 'Please select a valid participant.' }];
        return res.redirect('/milestones/new');
    }
    
    // Verify participant exists
    try {
        const participant = await knexInstance('People')
            .where('PersonID', personId)
            .first();
        
        if (!participant) {
            req.session.messages = [{ type: 'error', text: 'Selected participant not found.' }];
            return res.redirect('/milestones/new');
        }
    } catch (checkError) {
        console.error('Error checking participant:', checkError);
        req.session.messages = [{ type: 'error', text: 'Error validating participant.' }];
        return res.redirect('/milestones/new');
    }
    
    try {
        // Insert into Milestones table
        const milestoneDate = new Date(achievement_date);
        
        try {
            await knexInstance('Milestones')
                .insert({
                    PersonID: personId,
                    MilestoneTitle: milestone_name,
                    MilestoneDate: milestoneDate
                });
        } catch (insertError) {
            // If insert fails due to sequence issue, reset sequence and retry
            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                // Get max ID and reset sequence
                const maxIdResult = await knexInstance('Milestones')
                    .max('MilestoneID as max_id')
                    .first();
                
                const maxId = maxIdResult?.max_id || 0;
                await knexInstance.raw(`SELECT setval('milestones_milestoneid_seq', ${maxId}, true)`);
                
                // Try insert again
                await knexInstance('Milestones')
                    .insert({
                        PersonID: personId,
                        MilestoneTitle: milestone_name,
                        MilestoneDate: milestoneDate
                    });
            } else {
                throw insertError; // Re-throw if it's a different error
            }
        }
        
        req.session.messages = [{ type: 'success', text: 'Milestone created successfully' }];
        res.redirect('/milestones');
    } catch (error) {
        console.error('Error creating milestone:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating milestone: ' + error.message }];
        res.redirect('/milestones/new');
    }
});

router.get('/milestones/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        const milestoneData = await knexInstance('Milestones').where({ MilestoneID: id }).first();
        
        if (!milestoneData) {
            req.session.messages = [{ type: 'error', text: 'Milestone not found.' }];
            return res.redirect('/milestones');
        }
        
        // Fetch participants from database (matching FInalTableCreation.sql schema)
        const participants = await knexInstance('People')
            .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .where('Roles.RoleName', 'Participant')
            .select('People.PersonID', 'People.FirstName', 'People.LastName', 'People.Email')
            .orderBy('People.LastName', 'asc');
        
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

router.get('/donations', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/donations' : 'user/donations';
    
    try {
        // Get donations - use People.Email (Donations table doesn't have DonorEmail column)
        // Always use Donations.DonationDate for the date
        const donations = await knexInstance('Donations')
            .leftJoin('People', 'Donations.PersonID', 'People.PersonID')
            .select(
                'Donations.DonationID',
                'Donations.PersonID',
                'Donations.DonationDate',
                'Donations.DonationAmount',
                'People.FirstName',
                'People.LastName',
                'People.Email'
            )
            .orderBy('Donations.DonationDate', 'desc');
        
        res.render(viewPath, {
            title: 'Donations - Ella Rises',
            user: user,
            donations: donations || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.render(viewPath, {
            title: 'Donations - Ella Rises',
            user: user,
            donations: [],
            messages: [{ type: 'info', text: 'Database not connected. Donations will appear here once the database is set up.' }]
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
    
    // Validate required fields
    if (!donor_name || !donor_email || !amount || !donation_date) {
        req.session.messages = [{ type: 'error', text: 'Donor name, email, amount, and donation date are required.' }];
        return res.redirect('/donations/new');
    }
    
    try {
        // Step 1: Check if Person exists by email, create if not
        let person = await knexInstance('People')
            .where('Email', donor_email)
            .first();
        
        if (!person) {
            // Create new person for donor
            const nameParts = donor_name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            const [newPerson] = await knexInstance('People')
                .insert({
                    FirstName: firstName,
                    LastName: lastName,
                    Email: donor_email,
                    PhoneNumber: donor_phone || null
                })
                .returning('PersonID');
            person = newPerson;
        }
        
        const personId = person.PersonID || person.personid;
        
        // Step 2: Create Donation
        const donationDate = new Date(donation_date);
        await knexInstance('Donations')
            .insert({
                PersonID: personId,
                DonationDate: donationDate,
                DonationAmount: parseFloat(amount)
            });
        
        req.session.messages = [{ type: 'success', text: 'Donation recorded successfully' }];
        res.redirect('/donations');
    } catch (error) {
        console.error('Error creating donation:', error);
        req.session.messages = [{ type: 'error', text: 'Error recording donation: ' + error.message }];
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
        title: '404 - Page Not Found - Ella Rises',
        user: req.session ? req.session.user : null
    });
});

module.exports = router;

