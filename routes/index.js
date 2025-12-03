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
        const events = await db('EventOccurrences')
            .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
            .select(
                'EventOccurrences.EventOccurrenceID as event_id',
                'EventOccurrences.EventName as event_name',
                'EventOccurrences.EventDateTimeStart as event_date',
                'EventOccurrences.EventLocation as location',
                'EventOccurrences.EventDescription as description',
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
        // Render without events if DB fails or tables don't exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log('Database tables not created yet. Run FInalTableCreation.sql to create tables.');
        } else {
            console.error('Error fetching events:', error);
        }
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

// Query testing page - GET
router.get('/test-login-query', (req, res) => {
    res.render('test/query-test', {
        title: 'Query Testing - Ella Rises',
        user: req.session.user || null
    });
});

// Query testing page - POST (test the login query)
router.post('/test-login-query', async (req, res) => {
    const sEmail = req.body.email;
    const sPassword = req.body.password;

    try {
        // Run the same unified login query
        const userData = await db.raw(`
            SELECT 
                p.PersonID,
                p.Email,
                p.FirstName,
                p.LastName,
                r.RoleID,
                r.RoleName,
                CASE 
                    WHEN r.RoleID = 1 THEN ad.Password
                    WHEN r.RoleID = 2 THEN vd.Password
                    WHEN r.RoleID = 3 THEN pd.Password
                END AS RolePassword,
                ad.AdminRole,
                ad.Salary,
                vd.VolunteerRole,
                pd.ParticipantSchoolOrEmployer,
                pd.ParticipantFieldOfInterest,
                pd.NewsLetter
            FROM People p
            JOIN PeopleRoles pr ON p.PersonID = pr.PersonID
            JOIN Roles r ON pr.RoleID = r.RoleID
            LEFT JOIN AdminDetails ad ON p.PersonID = ad.PersonID AND r.RoleID = 1
            LEFT JOIN VolunteerDetails vd ON p.PersonID = vd.PersonID AND r.RoleID = 2
            LEFT JOIN ParticipantDetails pd ON p.PersonID = pd.PersonID AND r.RoleID = 3
            WHERE p.Email = ?
            LIMIT 1
        `, [sEmail]);

        const user = userData.rows && userData.rows.length > 0 ? userData.rows[0] : null;

        if (!user) {
            return res.render('test/query-test', {
                title: 'Query Testing - Ella Rises',
                user: req.session.user || null,
                loginError: 'No user found with that email',
                testEmail: sEmail
            });
        }

        // Build result object showing all query data
        const result = {
            found: true,
            user: {
                PersonID: user.PersonID,
                Email: user.Email,
                FirstName: user.FirstName,
                LastName: user.LastName,
                RoleID: user.RoleID,
                RoleName: user.RoleName,
                RolePassword: user.RolePassword ? '***SET***' : null, // Hide password in display
                RolePasswordMatch: user.RolePassword === sPassword,
                ProvidedPassword: sPassword
            },
            roleDetails: {}
        };

        // Add role-specific details
        if (user.RoleID === 1) {
            result.roleDetails = {
                AdminRole: user.AdminRole,
                Salary: user.Salary
            };
        } else if (user.RoleID === 2) {
            result.roleDetails = {
                VolunteerRole: user.VolunteerRole
            };
        } else if (user.RoleID === 3) {
            result.roleDetails = {
                ParticipantSchoolOrEmployer: user.ParticipantSchoolOrEmployer,
                ParticipantFieldOfInterest: user.ParticipantFieldOfInterest,
                NewsLetter: user.NewsLetter
            };
        }

        // Add password comparison result
        result.passwordMatch = user.RolePassword === sPassword;
        result.message = result.passwordMatch 
            ? '✓ Password matches! Login would succeed.' 
            : '✗ Password does not match. Login would fail.';

        res.render('test/query-test', {
            title: 'Query Testing - Ella Rises',
            user: req.session.user || null,
            loginResult: result,
            testEmail: sEmail
        });

    } catch (err) {
        console.error("Query test error:", err);
        res.render('test/query-test', {
            title: 'Query Testing - Ella Rises',
            user: req.session.user || null,
            loginError: `Query Error: ${err.message}`,
            testEmail: sEmail
        });
    }
});

// Login form submission - plain text password comparison
// Login form submission - single unified query with conditional role details
router.post('/login', async (req, res) => {
    const sEmail = req.body.username;
    const sPassword = req.body.password;

    try {
        // Single unified query that finds person, resolves role, and gets role-specific password
        const userData = await db.raw(`
            SELECT 
                p.PersonID,
                p.Email,
                p.FirstName,
                p.LastName,
                r.RoleID,
                r.RoleName,
                CASE 
                    WHEN r.RoleID = 1 THEN ad.Password
                    WHEN r.RoleID = 2 THEN vd.Password
                    WHEN r.RoleID = 3 THEN pd.Password
                END AS RolePassword,
                ad.AdminRole,
                ad.Salary,
                vd.VolunteerRole,
                pd.ParticipantSchoolOrEmployer,
                pd.ParticipantFieldOfInterest,
                pd.NewsLetter
            FROM People p
            JOIN PeopleRoles pr ON p.PersonID = pr.PersonID
            JOIN Roles r ON pr.RoleID = r.RoleID
            LEFT JOIN AdminDetails ad ON p.PersonID = ad.PersonID AND r.RoleID = 1
            LEFT JOIN VolunteerDetails vd ON p.PersonID = vd.PersonID AND r.RoleID = 2
            LEFT JOIN ParticipantDetails pd ON p.PersonID = pd.PersonID AND r.RoleID = 3
            WHERE p.Email = ?
            LIMIT 1
        `, [sEmail]);

        const user = userData.rows && userData.rows.length > 0 ? userData.rows[0] : null;

        if (!user) {
            return res.render("auth/login", { error_message: "Invalid email or password" });
        }

        // Check if password matches (plain text comparison as per requirements)
        if (user.RolePassword !== sPassword) {
            return res.render("auth/login", { error_message: "Invalid email or password" });
        }

        // Build role-specific details object
        const roleDetails = {};
        if (user.RoleID === 1) {
            // Admin
            roleDetails.AdminRole = user.AdminRole;
            roleDetails.Salary = user.Salary;
        } else if (user.RoleID === 2) {
            // Volunteer
            roleDetails.VolunteerRole = user.VolunteerRole;
        } else if (user.RoleID === 3) {
            // Participant
            roleDetails.ParticipantSchoolOrEmployer = user.ParticipantSchoolOrEmployer;
            roleDetails.ParticipantFieldOfInterest = user.ParticipantFieldOfInterest;
            roleDetails.NewsLetter = user.NewsLetter;
        }

        // Set session data
        req.session.isLoggedIn = true;
        req.session.user = {
            id: user.PersonID,
            PersonID: user.PersonID,
            username: user.Email,
            email: user.Email,
            firstName: user.FirstName,
            lastName: user.LastName,
            role: user.RoleName.toLowerCase() === 'admin' ? 'manager' : 'user',
            RoleID: user.RoleID,
            RoleName: user.RoleName,
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
    
    // Validate passwords
    if (!password || password.length < 1) {
        return res.render('auth/setup-password', {
            title: 'Setup Password - Ella Rises',
            username: username || '',
            email: email || '',
            error: 'Password must be at least 1 characters long',
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
                const registrations = await db('EventRegistrations')
                    .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
                    .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
                    .where({ 'EventRegistrations.PersonID': userId })
                    .select('EventTemplate.EventName as program', 'EventRegistrations.RegistrationCreatedAt as registrationDate')
                    .orderBy('EventRegistrations.RegistrationCreatedAt', 'desc');
                
                const surveys = await db('Surveys')
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
        const subscribers = await db('ParticipantDetails')
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
        // Get all people with their roles (matching FInalTableCreation.sql schema)
        // For PostgreSQL, we'll get people and their roles separately
        const people = await db('People')
            .select('*')
            .orderBy('People.PersonID', 'desc');
        
        // Get roles for each person
        const users = await Promise.all(people.map(async (person) => {
            const roles = await db('PeopleRoles')
                .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
                .where('PeopleRoles.PersonID', person.PersonID || person.personid)
                .select('Roles.RoleName');
            
            return {
                ...person,
                roles: roles.map(r => r.RoleName || r.rolename).join(', ')
            };
        }));
        
        res.render('manager/users', {
            title: 'User Maintenance - Ella Rises',
            user: req.session.user,
            users: users || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('manager/users', {
            title: 'User Maintenance - Ella Rises',
            user: req.session.user,
            users: [],
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
router.get('/participants', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/participants' : 'user/participants';
    
    try {
        // Get participants: People with Participant role + ParticipantDetails
        const participants = await db('People')
            .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .join('ParticipantDetails', 'People.PersonID', 'ParticipantDetails.PersonID')
            .where('Roles.RoleName', 'Participant')
            .select(
                'People.*',
                'ParticipantDetails.ParticipantSchoolOrEmployer',
                'ParticipantDetails.ParticipantFieldOfInterest',
                'ParticipantDetails.NewsLetter'
            )
            .orderBy('People.PersonID', 'desc');
        
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

router.get('/events', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/events' : 'user/events';
    
    try {
        // Get event occurrences (matching FInalTableCreation.sql schema)
        const events = await db('EventOccurrences')
            .join('EventTemplate', 'EventOccurrences.EventTemplateID', 'EventTemplate.EventTemplateID')
            .select(
                'EventOccurrences.*',
                'EventTemplate.EventType',
                'EventTemplate.EventDescription',
                'EventTemplate.EventRecurrencePattern'
            )
            .orderBy('EventOccurrences.EventDateTimeStart', 'asc');
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
                .join('EventRegistrations', 'Surveys.RegistrationID', 'EventRegistrations.RegistrationID')
                .join('EventOccurrences', 'EventRegistrations.EventOccurrenceID', 'EventOccurrences.EventOccurrenceID')
                .where({ 'EventRegistrations.PersonID': userId })
                .select('Surveys.*', 'EventOccurrences.EventName as eventName')
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
        // Get all surveys (matching FInalTableCreation.sql schema)
        const surveys = await db('Surveys')
            .join('EventRegistrations', 'Surveys.RegistrationID', 'EventRegistrations.RegistrationID')
            .join('People', 'EventRegistrations.PersonID', 'People.PersonID')
            .select('Surveys.*', 'People.FirstName', 'People.LastName')
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

router.get('/milestones', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/milestones' : 'user/milestones';
    
    try {
        let milestones;
        
        if (isManager) {
            // Managers see all milestones (matching FInalTableCreation.sql schema)
            milestones = await db('Milestones')
                .join('People', 'Milestones.PersonID', 'People.PersonID')
                .select('Milestones.*', 'People.FirstName', 'People.LastName')
                .orderBy('Milestones.MilestoneDate', 'desc');
        } else {
            // Regular users see only their own milestones
            const userId = user.id;
            milestones = await db('Milestones')
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
        const participants = await db('People')
            .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .where('Roles.RoleName', 'Participant')
            .select('People.PersonID', 'People.FirstName', 'People.LastName')
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
        
        // Fetch participants from database (matching FInalTableCreation.sql schema)
        const participants = await db('People')
            .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
            .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
            .where('Roles.RoleName', 'Participant')
            .select('People.PersonID', 'People.FirstName', 'People.LastName')
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
        // Get donations with person info (matching FInalTableCreation.sql schema)
        const donations = await db('Donations')
            .join('People', 'Donations.PersonID', 'People.PersonID')
            .select('Donations.*', 'People.FirstName', 'People.LastName')
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
        title: '404 - Page Not Found - Ella Rises',
        user: req.session ? req.session.user : null
    });
});

module.exports = router;

