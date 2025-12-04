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

// Date formatting helper function
function formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString().slice(0, 10);
}

// API route to clear messages after they've been displayed
router.post('/api/clear-messages', (req, res) => {
    if (req.session && req.session.messages) {
        req.session.messages = [];
    }
    res.status(200).send('OK');
});


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
// POST /login-email - Email-first login step
router.post('/login-email', async (req, res) => {
    const email = req.body.email;

    try {
        // Query using LEFT JOINs to check for passwords in all detail tables
        const user = await knexInstance('people as p')
            .leftJoin('admindetails as ad', 'ad.personid', 'p.personid')
            .leftJoin('volunteerdetails as vd', 'vd.personid', 'p.personid')
            .leftJoin('participantdetails as pd', 'pd.personid', 'p.personid')
            .where('p.email', email)
            .select(
                'p.personid',
                'p.email',
                'ad.password as adminpassword',
                'vd.password as volunteerpassword',
                'pd.password as participantpassword'
            )
            .first();

        if (!user) {
            return res.render("auth/login", { 
                error_message: "Email not found.",
                user: null,
                messages: []
            });
        }

        // If user has NO password in any detail table, redirect to create password
        if (!user.adminpassword && !user.volunteerpassword && !user.participantpassword) {
            return res.redirect(`/create-password/${user.personid}`);
        }

        // User HAS a password → redirect to password entry
        return res.redirect(`/login-password/${user.personid}`);
    } catch (err) {
        console.error("Login email error:", err);
        return res.render("auth/login", { 
            error_message: "System error during login",
            user: null,
            messages: []
        });
    }
});

// GET /login-password/:personid - Password entry screen
router.get('/login-password/:personid', async (req, res) => {
    const { personid } = req.params;

    try {
        // Look up user with password check from all detail tables
        const user = await knexInstance('people as p')
            .leftJoin('admindetails as ad', 'ad.personid', 'p.personid')
            .leftJoin('volunteerdetails as vd', 'vd.personid', 'p.personid')
            .leftJoin('participantdetails as pd', 'pd.personid', 'p.personid')
            .where('p.personid', personid)
            .select(
                'p.personid',
                'p.email',
                'ad.password as adminpassword',
                'vd.password as volunteerpassword',
                'pd.password as participantpassword'
            )
            .first();

        if (!user || (!user.adminpassword && !user.volunteerpassword && !user.participantpassword)) {
            return res.redirect('/login');
        }

        res.render('auth/login-password', {
            title: 'Enter Password - Ella Rises',
            personid: personid,
            email: user.email,
            error_message: req.query.error || null,
            user: null,
            messages: []
        });
    } catch (err) {
        console.error("Password page error:", err);
        return res.redirect('/login');
    }
});

// POST /login-password/:personid - Verify password and login
router.post('/login-password/:personid', async (req, res) => {
    const { personid } = req.params;
    const password = req.body.password;

    try {
        // Look up user with password check from all detail tables
        const user = await knexInstance('people as p')
            .leftJoin('admindetails as ad', 'ad.personid', 'p.personid')
            .leftJoin('volunteerdetails as vd', 'vd.personid', 'p.personid')
            .leftJoin('participantdetails as pd', 'pd.personid', 'p.personid')
            .where('p.personid', personid)
            .select(
                'p.personid',
                'p.email',
                'p.firstname',
                'p.lastname',
                'ad.password as adminpassword',
                'vd.password as volunteerpassword',
                'pd.password as participantpassword'
            )
            .first();

        if (!user) {
            return res.redirect('/login');
        }

        // Compare raw password and determine role
        let matchedRole = null;
        let userRole = null;

        if (user.adminpassword === password) {
            matchedRole = 'Admin';
            userRole = 'manager';
        } else if (user.volunteerpassword === password) {
            matchedRole = 'Volunteer';
            userRole = 'user';
        } else if (user.participantpassword === password) {
            matchedRole = 'Participant';
            userRole = 'user';
        }

        if (!matchedRole) {
            return res.redirect(`/login-password/${personid}?error=Invalid password`);
        }

        // Fetch all user roles from peopleroles for session
        const userRoles = await knexInstance('peopleroles as pr')
            .join('roles as r', 'pr.roleid', 'r.roleid')
            .where('pr.personid', personid)
            .select('r.rolename');

        const roleNames = userRoles.map(r => r.rolename).filter(Boolean);

        // Set session
        req.session.isLoggedIn = true;
        req.session.user = {
            personid: user.personid,
            id: user.personid,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            role: userRole,
            roles: roleNames.map(r => r.toLowerCase())
        };

        // Redirect to dashboard or returnTo URL
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        return res.redirect(returnTo);
    } catch (err) {
        console.error("Password verification error:", err);
        return res.redirect(`/login-password/${personid}?error=System error`);
    }
});

// GET /create-password/:personid - Password creation screen
router.get('/create-password/:personid', async (req, res) => {
    const { personid } = req.params;

    try {
        // Look up user with password check from all detail tables
        const user = await knexInstance('people as p')
            .leftJoin('admindetails as ad', 'ad.personid', 'p.personid')
            .leftJoin('volunteerdetails as vd', 'vd.personid', 'p.personid')
            .leftJoin('participantdetails as pd', 'pd.personid', 'p.personid')
            .where('p.personid', personid)
            .select(
                'p.personid',
                'p.email',
                'ad.password as adminpassword',
                'vd.password as volunteerpassword',
                'pd.password as participantpassword'
            )
            .first();

        if (!user) {
            return res.redirect('/login');
        }

        // If password already exists in any detail table, redirect to password entry
        if (user.adminpassword || user.volunteerpassword || user.participantpassword) {
            return res.redirect(`/login-password/${personid}`);
        }

        res.render('auth/create-password', {
            title: 'Create Password - Ella Rises',
            personid: personid,
            email: user.email,
            error_message: req.query.error || null,
            user: null,
            messages: []
        });
    } catch (err) {
        console.error("Create password page error:", err);
        return res.redirect('/login');
    }
});

// POST /create-password/:personid - Create password and login
router.post('/create-password/:personid', async (req, res) => {
    const { personid } = req.params;
    const { password, confirmPassword } = req.body;

    try {
        // Validate passwords match
        if (password !== confirmPassword) {
            return res.redirect(`/create-password/${personid}?error=Passwords do not match`);
        }

        // Validate password length (1-20 characters to match VARCHAR(20))
        if (!password || password.length < 1) {
            return res.redirect(`/create-password/${personid}?error=Password is required`);
        }
        if (password.length > 20) {
            return res.redirect(`/create-password/${personid}?error=Password must be 20 characters or less`);
        }

        // Check if user has any role assigned
        const existingRole = await knexInstance('peopleroles')
            .where('personid', personid)
            .first();

        let roleToUse = null;

        // If user has NO role → assign PARTICIPANT role (roleid 1)
        if (!existingRole) {
            await knexInstance('peopleroles')
                .insert({
                    personid: personid,
                    roleid: 1 // Participant
                })
                .onConflict(['personid', 'roleid'])
                .ignore();
            roleToUse = { roleid: 1 };
        } else {
            roleToUse = existingRole;
        }

        // Check if password already exists
        const adminCheck = await knexInstance('admindetails')
            .where('personid', personid)
            .first();
        const volunteerCheck = await knexInstance('volunteerdetails')
            .where('personid', personid)
            .first();
        const participantCheck = await knexInstance('participantdetails')
            .where('personid', personid)
            .first();

        if (adminCheck?.password || volunteerCheck?.password || participantCheck?.password) {
            return res.redirect(`/login-password/${personid}`);
        }

        // Insert password in correct table based on role
        if (roleToUse.roleid === 3) {
            // Admin (roleid 3)
            const adminExists = await knexInstance('admindetails')
                .where('personid', personid)
                .first();

            if (adminExists) {
                await knexInstance('admindetails')
                    .where('personid', personid)
                    .update({ password: password });
            } else {
                await knexInstance('admindetails')
                    .insert({ personid: personid, password: password });
            }
        } else if (roleToUse.roleid === 2) {
            // Volunteer (roleid 2)
            const volunteerExists = await knexInstance('volunteerdetails')
                .where('personid', personid)
                .first();

            if (volunteerExists) {
                await knexInstance('volunteerdetails')
                    .where('personid', personid)
                    .update({ password: password });
            } else {
                await knexInstance('volunteerdetails')
                    .insert({ personid: personid, password: password });
            }
        } else {
            // Default → Participant (roleid 1)
            const participantExists = await knexInstance('participantdetails')
                .where('personid', personid)
                .first();

            if (participantExists) {
                await knexInstance('participantdetails')
                    .where('personid', personid)
                    .update({ password: password });
            } else {
                await knexInstance('participantdetails')
                    .insert({
                        personid: personid,
                        password: password,
                        participantschooloremployer: '',
                        participantfieldofinterest: '',
                        newsletter: false
                    });
            }
        }

        // Redirect to password entry page to log in
        return res.redirect(`/login-password/${personid}`);
    } catch (err) {
        console.error("Create password error:", err);
        return res.redirect(`/create-password/${personid}?error=System error`);
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
        // Get Admins
        const admins = await knexInstance('People as p')
            .join('PeopleRoles as pr', 'p.PersonID', 'pr.PersonID')
            .join('Roles as r', 'pr.RoleID', 'r.RoleID')
            .where('r.RoleName', 'Admin')
            .select('p.PersonID as personid', 'p.FirstName as firstname', 'p.LastName as lastname', 'p.Email as email', 'p.PhoneNumber as phonenumber', 'p.City as city', 'p.State as state')
            .orderBy('p.LastName', 'asc')
            .orderBy('p.FirstName', 'asc');

        // Get Volunteers
        const volunteers = await knexInstance('People as p')
            .join('PeopleRoles as pr', 'p.PersonID', 'pr.PersonID')
            .join('Roles as r', 'pr.RoleID', 'r.RoleID')
            .where('r.RoleName', 'Volunteer')
            .select('p.PersonID as personid', 'p.FirstName as firstname', 'p.LastName as lastname', 'p.Email as email', 'p.PhoneNumber as phonenumber', 'p.City as city', 'p.State as state')
            .orderBy('p.LastName', 'asc')
            .orderBy('p.FirstName', 'asc');

        res.render('manager/users', {
            title: 'User Maintenance',
            user: req.session.user || null,
            admins: admins || [],
            volunteers: volunteers || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('manager/users', {
            title: 'User Maintenance',
            user: req.session.user || null,
            admins: [],
            volunteers: [],
            messages: [{ type: 'error', text: 'Error loading user maintenance data.' }]
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

// GET /users/search/admin - Search API for admins
router.get('/users/search/admin', requireAuth, requireManager, async (req, res) => {
    try {
        const term = req.query.term || '';
        
        if (!term || term.trim().length === 0) {
            return res.json([]);
        }

        const results = await knexInstance('People')
            .whereRaw("LOWER(FirstName || ' ' || LastName || ' ' || Email) LIKE ?", [`%${term.toLowerCase()}%`])
            .select('PersonID as personid', 'FirstName as firstname', 'LastName as lastname', 'Email as email')
            .orderBy('LastName', 'asc')
            .orderBy('FirstName', 'asc')
            .limit(10);

        const formatted = results.map(row => ({
            personid: row.personid,
            name: `${row.firstname || ''} ${row.lastname || ''}`.trim(),
            email: row.email || ''
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error searching for admin:', error);
        res.json([]);
    }
});

// GET /users/search/volunteer - Search API for volunteers
router.get('/users/search/volunteer', requireAuth, requireManager, async (req, res) => {
    try {
        const term = req.query.term || '';
        
        if (!term || term.trim().length === 0) {
            return res.json([]);
        }

        const results = await knexInstance('People')
            .whereRaw("LOWER(FirstName || ' ' || LastName || ' ' || Email) LIKE ?", [`%${term.toLowerCase()}%`])
            .select('PersonID as personid', 'FirstName as firstname', 'LastName as lastname', 'Email as email')
            .orderBy('LastName', 'asc')
            .orderBy('FirstName', 'asc')
            .limit(10);

        const formatted = results.map(row => ({
            personid: row.personid,
            name: `${row.firstname || ''} ${row.lastname || ''}`.trim(),
            email: row.email || ''
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error searching for volunteer:', error);
        res.json([]);
    }
});

// POST /users/add-admin - Add admin role
router.post('/users/add-admin', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/users');
        }

        // Get Admin roleid
        const adminRole = await knexInstance('Roles')
            .where('RoleName', 'Admin')
            .first();

        if (!adminRole) {
            req.session.messages = [{ type: 'error', text: 'Admin role not found in database.' }];
            return res.redirect('/users');
        }

        // Insert with ON CONFLICT DO NOTHING
        await knexInstance.raw(`
            INSERT INTO "PeopleRoles" ("PersonID", "RoleID")
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
        `, [personid, adminRole.RoleID]);

        req.session.messages = [{ type: 'success', text: 'Admin role added successfully.' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error adding admin role:', error);
        req.session.messages = [{ type: 'error', text: 'Error adding admin role: ' + error.message }];
        res.redirect('/users');
    }
});

// POST /users/add-volunteer - Add volunteer role
router.post('/users/add-volunteer', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/users');
        }

        // Get Volunteer roleid
        const volunteerRole = await knexInstance('Roles')
            .where('RoleName', 'Volunteer')
            .first();

        if (!volunteerRole) {
            req.session.messages = [{ type: 'error', text: 'Volunteer role not found in database.' }];
            return res.redirect('/users');
        }

        // Insert with ON CONFLICT DO NOTHING
        await knexInstance.raw(`
            INSERT INTO "PeopleRoles" ("PersonID", "RoleID")
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
        `, [personid, volunteerRole.RoleID]);

        req.session.messages = [{ type: 'success', text: 'Volunteer role added successfully.' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error adding volunteer role:', error);
        req.session.messages = [{ type: 'error', text: 'Error adding volunteer role: ' + error.message }];
        res.redirect('/users');
    }
});

// POST /users/remove-admin - Remove admin role
router.post('/users/remove-admin', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/users');
        }

        // Delete the role assignment
        await knexInstance('peopleroles')
            .where({
                personid: personid,
                roleid: 3 // Admin
            })
            .del();

        req.session.messages = [{ type: 'success', text: 'Admin role removed successfully.' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error removing admin role:', error);
        req.session.messages = [{ type: 'error', text: 'Error removing admin role: ' + error.message }];
        res.redirect('/users');
    }
});

// POST /users/remove-volunteer - Remove volunteer role
router.post('/users/remove-volunteer', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/users');
        }

        // Delete the role assignment
        await knexInstance('peopleroles')
            .where({
                personid: personid,
                roleid: 2 // Volunteer
            })
            .del();

        req.session.messages = [{ type: 'success', text: 'Volunteer role removed successfully.' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error removing volunteer role:', error);
        req.session.messages = [{ type: 'error', text: 'Error removing volunteer role: ' + error.message }];
        res.redirect('/users');
    }
});

// POST /users/add-admin-manual - Add admin manually via modal form
router.post('/users/add-admin-manual', requireAuth, requireManager, async (req, res) => {
    try {
        const { firstname, lastname, email, phonenumber, city, state, zip, country } = req.body;

        if (!firstname || !lastname || !email) {
            req.session.messages = [{ type: 'error', text: 'First name, last name, and email are required.' }];
            return res.redirect('/users');
        }

        // 1. Check if person exists, create if not
        let person = await knexInstance('people').where({ email }).first();

        if (!person) {
            const inserted = await knexInstance('people')
                .insert({
                    firstname,
                    lastname,
                    email,
                    phonenumber,
                    city,
                    state,
                    zip,
                    country
                })
                .returning(['personid']);

            person = inserted[0];
        }

        const personId = person.personid;

        // 2. Always assign Participant role (roleid 1)
        await knexInstance('peopleroles')
            .insert({
                personid: personId,
                roleid: 1 // Participant
            })
            .onConflict(['personid', 'roleid'])
            .ignore();

        // 3. Assign Admin role (roleid 3)
        await knexInstance('peopleroles')
            .insert({
                personid: personId,
                roleid: 3 // Admin
            })
            .onConflict(['personid', 'roleid'])
            .ignore();

        req.session.messages = [{ type: 'success', text: 'Admin added successfully.' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error adding admin manually:', error);
        req.session.messages = [{ type: 'error', text: 'Error adding admin: ' + error.message }];
        res.redirect('/users');
    }
});

// POST /users/add-volunteer-manual - Add volunteer manually via modal form
router.post('/users/add-volunteer-manual', requireAuth, requireManager, async (req, res) => {
    try {
        const { firstname, lastname, email, phonenumber, city, state, zip, country } = req.body;

        if (!firstname || !lastname || !email) {
            req.session.messages = [{ type: 'error', text: 'First name, last name, and email are required.' }];
            return res.redirect('/users');
        }

        // 1. Check if person exists, create if not
        let person = await knexInstance('people').where({ email }).first();

        if (!person) {
            const inserted = await knexInstance('people')
                .insert({
                    firstname,
                    lastname,
                    email,
                    phonenumber,
                    city,
                    state,
                    zip,
                    country
                })
                .returning(['personid']);

            person = inserted[0];
        }

        const personId = person.personid;

        // 2. Always assign Participant role (roleid 1)
        await knexInstance('peopleroles')
            .insert({
                personid: personId,
                roleid: 1 // Participant
            })
            .onConflict(['personid', 'roleid'])
            .ignore();

        // 3. Assign Volunteer role (roleid 2)
        await knexInstance('peopleroles')
            .insert({
                personid: personId,
                roleid: 2 // Volunteer
            })
            .onConflict(['personid', 'roleid'])
            .ignore();

        req.session.messages = [{ type: 'success', text: 'Volunteer added successfully.' }];
        res.redirect('/users');
    } catch (error) {
        console.error('Error adding volunteer manually:', error);
        req.session.messages = [{ type: 'error', text: 'Error adding volunteer: ' + error.message }];
        res.redirect('/users');
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
        const participants = await knexInstance('people as p')
            .join('peopleroles', 'p.personid', 'peopleroles.personid')
            .join('roles', 'peopleroles.roleid', 'roles.roleid')
            .join('participantdetails', 'p.personid', 'participantdetails.personid')
            .where('roles.rolename', 'Participant')
            .select(
                'p.personid',
                'p.firstname',
                'p.lastname',
                'p.email',
                'p.phonenumber',
                'p.city',
                'p.state',
                'participantdetails.newsletter',
                knexInstance.raw(`
                    (
                        SELECT m2.milestonetitle
                        FROM milestones m2
                        WHERE m2.personid = p.personid
                        ORDER BY m2.milestonedate DESC
                        LIMIT 1
                    ) AS latest_milestone
                `)
            )
            .orderBy('p.lastname', 'asc');
        
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
        
        // Step 2: Insert into PeopleRoles with Participant role (roleid 1)
        await knexInstance('PeopleRoles')
            .insert({
                PersonID: personId,
                RoleID: 1 // Participant
            })
            .onConflict(['PersonID', 'RoleID'])
            .ignore();
        
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

router.get('/participants/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    try {
        const participant = await knexInstance("People as p")
            .leftJoin("ParticipantDetails as pd", "pd.PersonID", "p.PersonID")
            .where("p.PersonID", id)
            .select(
                "p.PersonID as personid",
                "p.FirstName as firstname",
                "p.LastName as lastname",
                "p.Email as email",
                "p.PhoneNumber as phonenumber",
                "p.City as city",
                "p.State as state",
                "p.Country as country",
                "p.Zip as zip",
                "pd.ParticipantSchoolOrEmployer as participantschooloremployer",
                "pd.ParticipantFieldOfInterest as participantfieldofinterest",
                "pd.NewsLetter as newsletter"
            )
            .first();

        if (!participant) {
            req.session.messages = [{ type: 'error', text: 'Participant not found.' }];
            return res.redirect('/participants');
        }

        res.render("manager/participants-edit", {
            title: "Edit Participant",
            user: req.session.user,
            participant
        });

    } catch (err) {
        console.error("Error loading participant:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading participant: ' + err.message }];
        res.redirect("/participants");
    }
});

router.post('/participants/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    const {
        firstname,
        lastname,
        email,
        phonenumber,
        city,
        state,
        school,
        interest,
        newsletter
    } = req.body;

    try {
        // Update People table
        await knexInstance("People")
            .where("PersonID", id)
            .update({
                FirstName: firstname,
                LastName: lastname,
                Email: email,
                PhoneNumber: phonenumber || null,
                City: city || null,
                State: state || null
            });

        // Ensure row exists in ParticipantDetails
        const hasDetails = await knexInstance("ParticipantDetails")
            .where("PersonID", id)
            .first();

        if (!hasDetails) {
            await knexInstance("ParticipantDetails")
                .insert({
                    PersonID: id,
                    ParticipantSchoolOrEmployer: school || null,
                    ParticipantFieldOfInterest: interest || null,
                    NewsLetter: newsletter === "true" ? 1 : 0
                });
        } else {
            await knexInstance("ParticipantDetails")
                .where("PersonID", id)
                .update({
                    ParticipantSchoolOrEmployer: school || null,
                    ParticipantFieldOfInterest: interest || null,
                    NewsLetter: newsletter === "true" ? 1 : 0
                });
        }

        req.session.messages = [{ type: 'success', text: 'Participant updated successfully' }];
        res.redirect("/participants");

    } catch (err) {
        console.error("Error updating participant:", err);
        req.session.messages = [{ type: 'error', text: 'Error updating participant: ' + err.message }];
        res.redirect("/participants/edit/" + id);
    }
});

router.post('/participants/:id/delete', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get all registration IDs for this person to delete surveys
        const registrations = await knexInstance('eventregistrations')
            .where('personid', id)
            .select('registrationid');
        
        const registrationIds = registrations.map(r => r.registrationid);
        
        // Delete surveys tied to registrations
        if (registrationIds.length > 0) {
            await knexInstance('surveys')
                .whereIn('registrationid', registrationIds)
                .del();
        }
        
        // Delete milestones
        await knexInstance('milestones')
            .where('personid', id)
            .del();

        // Delete event registrations
        await knexInstance('eventregistrations')
            .where('personid', id)
            .del();

        // Delete donations tied to this person
        await knexInstance('donations')
            .where('personid', id)
            .del();

        // Delete participant details
        await knexInstance('participantdetails')
            .where('personid', id)
            .del();

        // Delete volunteer details
        await knexInstance('volunteerdetails')
            .where('personid', id)
            .del();

        // Delete admin details
        await knexInstance('admindetails')
            .where('personid', id)
            .del();

        // Delete role assignments
        await knexInstance('peopleroles')
            .where('personid', id)
            .del();

        // Finally delete the person
        await knexInstance('people')
            .where('personid', id)
            .del();

        req.session.messages = [{ type: 'success', text: 'Participant deleted successfully.' }];
        return res.redirect('/participants');

    } catch (error) {
        console.error("Error deleting participant:", error);
        req.session.messages = [{ type: 'error', text: 'Error deleting participant.' }];
        return res.redirect('/participants');
    }
});

// Admin route alias for consistency
router.post('/admin/participants/delete/:personid', requireAuth, requireManager, async (req, res) => {
    const { personid } = req.params;
    
    try {
        // Get all registration IDs for this person to delete surveys
        const registrations = await knexInstance('eventregistrations')
            .where('personid', personid)
            .select('registrationid');
        
        const registrationIds = registrations.map(r => r.registrationid);
        
        // Delete surveys tied to registrations
        if (registrationIds.length > 0) {
            await knexInstance('surveys')
                .whereIn('registrationid', registrationIds)
                .del();
        }
        
        // Delete milestones
        await knexInstance('milestones')
            .where('personid', personid)
            .del();

        // Delete event registrations
        await knexInstance('eventregistrations')
            .where('personid', personid)
            .del();

        // Delete donations tied to this person
        await knexInstance('donations')
            .where('personid', personid)
            .del();

        // Delete participant details
        await knexInstance('participantdetails')
            .where('personid', personid)
            .del();

        // Delete volunteer details
        await knexInstance('volunteerdetails')
            .where('personid', personid)
            .del();

        // Delete admin details
        await knexInstance('admindetails')
            .where('personid', personid)
            .del();

        // Delete role assignments
        await knexInstance('peopleroles')
            .where('personid', personid)
            .del();

        // Finally delete the person
        await knexInstance('people')
            .where('personid', personid)
            .del();

        req.session.messages = [{ type: 'success', text: 'Participant deleted successfully.' }];
        return res.redirect('/participants');

    } catch (error) {
        console.error("Error deleting participant:", error);
        req.session.messages = [{ type: 'error', text: 'Error deleting participant.' }];
        return res.redirect('/participants');
    }
});

// ============================================================================
// EVENT ROUTES (View: public/common users, CRUD: manager only)
// ============================================================================

router.get('/events', requireAuth, async (req, res) => {
    const user = req.session.user || null;
    const isManager = user && user.role === 'manager';
    const viewPath = isManager ? 'manager/events' : 'user/events';
    const userId = user ? (user.personid || user.id) : null;
    
    // Get filter from query parameter (future or past, default to future)
    const filter = req.query.filter || 'future';
    
    try {
        // Query individual occurrences (not grouped) for manager view to enable editing
        let query = knexInstance('EventOccurrences as eo')
            .join('EventTemplate as et', 'eo.EventTemplateID', 'et.EventTemplateID')
            .select(
                'eo.EventOccurrenceID',
                'eo.EventName',
                'eo.EventLocation',
                'eo.EventDateTimeStart',
                'eo.EventDateTimeEnd',
                'eo.EventCapacity',
                'et.EventType'
            );
        
        // Apply time-based filter
        const now = knexInstance.fn.now();
        if (filter === 'future') {
            query = query.where('eo.EventDateTimeStart', '>=', now);
        } else if (filter === 'past') {
            query = query.where('eo.EventDateTimeStart', '<', now);
            
            // For non-manager users, only show events they attended
            if (!isManager && userId) {
                query = query
                    .join('EventRegistrations as er', 'er.EventOccurrenceID', 'eo.EventOccurrenceID')
                    .where('er.PersonID', userId)
                    .where('er.RegistrationAttendedFlag', 1);
            }
        }
        
        const occurrences = await query
            .orderBy('eo.EventDateTimeStart', filter === 'future' ? 'asc' : 'desc');
        
        // Get participant counts for each occurrence
        const eventsWithCounts = await Promise.all(occurrences.map(async (occurrence) => {
            const occurrenceId = occurrence.EventOccurrenceID || occurrence.eventoccurrenceid;
            
            // Count participants for this occurrence
            let totalParticipants = 0;
            const participantCount = await knexInstance('EventRegistrations')
                .where('EventOccurrenceID', occurrenceId)
                .count('RegistrationID as count')
                .first();
            totalParticipants = participantCount ? (parseInt(participantCount.count) || 0) : 0;
            
            return {
                EventOccurrenceID: occurrenceId,
                EventName: occurrence.EventName || occurrence.eventname,
                EventType: occurrence.EventType || occurrence.eventtype || 'N/A',
                EventLocation: occurrence.EventLocation || occurrence.eventlocation || 'TBA',
                EventDateTimeStart: occurrence.EventDateTimeStart || occurrence.eventdatetimestart,
                EventDateTimeEnd: occurrence.EventDateTimeEnd || occurrence.eventdatetimeend,
                EventCapacity: occurrence.EventCapacity || occurrence.eventcapacity,
                participantCount: totalParticipants,
                isPast: filter === 'past'
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

router.get('/events/new', requireAuth, requireManager, (req, res) => {
    res.render('manager/events-form', {
        title: 'Add New Event - Ella Rises',
        user: req.session.user,
        eventData: null
    });
});

router.post('/events/new', requireAuth, requireManager, async (req, res) => {
    const { event_name, event_type, eventstart, eventend, location, description, eventcapacity, eventregistrationdeadline } = req.body;
    
    // Validate required fields
    if (!event_name || !event_type || !eventstart || !eventend || !location) {
        req.session.messages = [{ type: 'error', text: 'Event name, type, start time, end time, and location are required.' }];
        return res.redirect('/events/new');
    }
    
    try {
        // Fix sequence before insert if needed
        const { fixEventOccurrenceSequence, fixEventTemplateSequence } = require('../utils/fixSequences');
        
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
                        EventDefaultCapacity: eventcapacity ? parseInt(eventcapacity) : null
                    })
                    .returning('EventTemplateID');
                eventTemplate = newTemplate;
            } catch (insertError) {
                // If insert fails due to sequence issue, reset sequence and retry
                if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                    await fixEventTemplateSequence(knexInstance);
                    
                    // Try insert again
                    const [newTemplate] = await knexInstance('EventTemplate')
                        .insert({
                            EventName: event_name,
                            EventType: event_type,
                            EventDescription: description || null,
                            EventDefaultCapacity: eventcapacity ? parseInt(eventcapacity) : null
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
        
        // Step 2: Create EventOccurrence (DO NOT include EventOccurrenceID - let SERIAL handle it)
        try {
            await knexInstance('EventOccurrences')
                .insert({
                    EventTemplateID: templateId,
                    EventName: event_name,
                    EventLocation: location,
                    EventDateTimeStart: eventstart ? new Date(eventstart) : null,
                    EventDateTimeEnd: eventend ? new Date(eventend) : null,
                    EventCapacity: eventcapacity ? parseInt(eventcapacity) : null,
                    EventRegistrationDeadline: eventregistrationdeadline ? new Date(eventregistrationdeadline) : null
                });
        } catch (insertError) {
            // If insert fails due to sequence issue, reset sequence and retry
            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                await fixEventOccurrenceSequence(knexInstance);
                
                // Try insert again
                await knexInstance('EventOccurrences')
                    .insert({
                        EventTemplateID: templateId,
                        EventName: event_name,
                        EventLocation: location,
                        EventDateTimeStart: eventstart ? new Date(eventstart) : null,
                        EventDateTimeEnd: eventend ? new Date(eventend) : null,
                        EventCapacity: eventcapacity ? parseInt(eventcapacity) : null,
                        EventRegistrationDeadline: eventregistrationdeadline ? new Date(eventregistrationdeadline) : null
                    });
            } else {
                throw insertError; // Re-throw if it's a different error
            }
        }
        
        req.session.messages = [{ type: 'success', text: 'Event created successfully' }];
        res.redirect('/events');
    } catch (error) {
        console.error('Error creating event:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating event: ' + error.message }];
        res.redirect('/events/new');
    }
});

router.get('/events/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    try {
        const event = await knexInstance("EventOccurrences as eo")
            .leftJoin("EventTemplate as et", "eo.EventTemplateID", "et.EventTemplateID")
            .where("eo.EventOccurrenceID", id)
            .select(
                "eo.EventOccurrenceID as eventoccurrenceid",
                "eo.EventName as eventname",
                "eo.EventDateTimeStart as eventdatetimestart",
                "eo.EventDateTimeEnd as eventdatetimeend",
                "eo.EventLocation as eventlocation",
                "eo.EventCapacity as eventcapacity",
                "et.EventTemplateID as eventtemplateid",
                "et.EventType as eventtype",
                "et.EventDescription as eventdescription"
            )
            .first();

        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect('/events');
        }

        res.render("manager/events-edit", {
            title: "Edit Event",
            user: req.session.user,
            event
        });

    } catch (err) {
        console.error("Error loading event:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading event: ' + err.message }];
        return res.redirect("/events");
    }
});

router.post('/events/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    const {
        eventname,
        eventtype,
        eventdescription,
        eventlocation,
        eventstart,
        eventend,
        eventcapacity
    } = req.body;

    try {
        // Update Event Template (if needed)
        const event = await knexInstance("EventOccurrences")
            .where("EventOccurrenceID", id)
            .first();

        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect("/events");
        }

        const templateId = event.eventtemplateid || event.EventTemplateID;

        await knexInstance("EventTemplate")
            .where("EventTemplateID", templateId)
            .update({
                EventType: eventtype || null,
                EventDescription: eventdescription || null
            });

        // Update EventOccurrence fields
        await knexInstance("EventOccurrences")
            .where("EventOccurrenceID", id)
            .update({
                EventName: eventname,
                EventLocation: eventlocation || null,
                EventDateTimeStart: eventstart ? new Date(eventstart) : null,
                EventDateTimeEnd: eventend ? new Date(eventend) : null,
                EventCapacity: eventcapacity ? parseInt(eventcapacity) : null
            });

        req.session.messages = [{ type: 'success', text: 'Event updated successfully' }];
        res.redirect("/events");

    } catch (err) {
        console.error("Error updating event:", err);
        req.session.messages = [{ type: 'error', text: 'Error updating event: ' + err.message }];
        res.redirect("/events/edit/" + id);
    }
});

// GET Route: Edit Future Event
router.get('/events/future/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    try {
        const event = await knexInstance("EventOccurrences as eo")
            .leftJoin("EventTemplate as et", "et.EventTemplateID", "eo.EventTemplateID")
            .where("eo.EventOccurrenceID", id)
            .select(
                "eo.EventOccurrenceID as eventoccurrenceid",
                "eo.EventName as eventname",
                "eo.EventLocation as eventlocation",
                "eo.EventDateTimeStart as eventdatetimestart",
                "eo.EventDateTimeEnd as eventdatetimeend",
                "eo.EventCapacity as eventcapacity",
                "eo.EventRegistrationDeadline as eventregistrationdeadline",
                "et.EventTemplateID as eventtemplateid",
                "et.EventType as eventtype",
                "et.EventDescription as eventdescription"
            )
            .first();

        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect("/events?filter=future");
        }

        res.render("manager/events-edit-future", {
            title: "Edit Future Event",
            event,
            user: req.session.user
        });

    } catch (err) {
        console.error("Error loading event:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading event: ' + err.message }];
        res.redirect("/events?filter=future");
    }
});

// GET Route: Edit Past Event
router.get('/events/past/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    try {
        const event = await knexInstance("EventOccurrences as eo")
            .leftJoin("EventTemplate as et", "et.EventTemplateID", "eo.EventTemplateID")
            .where("eo.EventOccurrenceID", id)
            .select(
                "eo.EventOccurrenceID as eventoccurrenceid",
                "eo.EventName as eventname",
                "eo.EventLocation as eventlocation",
                "eo.EventDateTimeStart as eventdatetimestart",
                "eo.EventDateTimeEnd as eventdatetimeend",
                "eo.EventCapacity as eventcapacity",
                "eo.EventRegistrationDeadline as eventregistrationdeadline",
                "et.EventTemplateID as eventtemplateid",
                "et.EventType as eventtype",
                "et.EventDescription as eventdescription"
            )
            .first();

        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect("/events?filter=past");
        }

        res.render("manager/events-edit-past", {
            title: "Edit Past Event",
            event,
            user: req.session.user
        });

    } catch (err) {
        console.error("Error loading event:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading event: ' + err.message }];
        res.redirect("/events?filter=past");
    }
});

// POST Route: Save Future Event Edit
router.post('/events/future/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    const {
        eventname,
        eventtype,
        eventdescription,
        eventlocation,
        eventstart,
        eventend,
        eventcapacity,
        eventregistrationdeadline
    } = req.body;

    try {
        const event = await knexInstance("EventOccurrences")
            .where("EventOccurrenceID", id)
            .first();

        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect("/events?filter=future");
        }

        const templateId = event.eventtemplateid || event.EventTemplateID;

        await knexInstance("EventTemplate")
            .where("EventTemplateID", templateId)
            .update({
                EventType: eventtype || null,
                EventDescription: eventdescription || null
            });

        await knexInstance("EventOccurrences")
            .where("EventOccurrenceID", id)
            .update({
                EventName: eventname,
                EventLocation: eventlocation || null,
                EventDateTimeStart: eventstart ? new Date(eventstart) : null,
                EventDateTimeEnd: eventend ? new Date(eventend) : null,
                EventCapacity: eventcapacity ? parseInt(eventcapacity) : null,
                EventRegistrationDeadline: eventregistrationdeadline ? new Date(eventregistrationdeadline) : null
            });

        req.session.messages = [{ type: 'success', text: 'Future event updated successfully' }];
        res.redirect("/events?filter=future");

    } catch (err) {
        console.error("Error editing future event:", err);
        req.session.messages = [{ type: 'error', text: 'Error updating event: ' + err.message }];
        res.redirect("/events/future/edit/" + id);
    }
});

// POST Route: Save Past Event Edit
router.post('/events/past/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    const {
        eventname,
        eventtype,
        eventdescription,
        eventlocation,
        eventstart,
        eventend
    } = req.body;

    try {
        const event = await knexInstance("EventOccurrences")
            .where("EventOccurrenceID", id)
            .first();

        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect("/events?filter=past");
        }

        const templateId = event.eventtemplateid || event.EventTemplateID;

        await knexInstance("EventTemplate")
            .where("EventTemplateID", templateId)
            .update({
                EventType: eventtype || null,
                EventDescription: eventdescription || null
            });

        await knexInstance("EventOccurrences")
            .where("EventOccurrenceID", id)
            .update({
                EventName: eventname,
                EventLocation: eventlocation || null,
                EventDateTimeStart: eventstart ? new Date(eventstart) : null,
                EventDateTimeEnd: eventend ? new Date(eventend) : null
            });

        req.session.messages = [{ type: 'success', text: 'Past event updated successfully' }];
        res.redirect("/events?filter=past");

    } catch (err) {
        console.error("Error editing past event:", err);
        req.session.messages = [{ type: 'error', text: 'Error updating event: ' + err.message }];
        res.redirect("/events/past/edit/" + id);
    }
});

router.post('/admin/events/delete/:eventoccurrenceid', requireAuth, requireManager, async (req, res) => {
    const { eventoccurrenceid } = req.params;
    
    try {
        // Delete registrations first (foreign key constraint)
        await knexInstance('eventregistrations')
            .where('eventoccurrenceid', eventoccurrenceid)
            .del();

        // Delete event occurrence
        await knexInstance('eventoccurrences')
            .where('eventoccurrenceid', eventoccurrenceid)
            .del();

        req.session.messages = [{ type: 'success', text: 'Event deleted successfully.' }];
        res.redirect('/events?filter=future');
    } catch (err) {
        console.error('Error deleting event:', err);
        req.session.messages = [{ type: 'error', text: 'Error deleting event.' }];
        res.redirect('/events?filter=future');
    }
});

// Legacy route for backwards compatibility
router.post('/events/:id/delete', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        // Delete registrations first
        await knexInstance('eventregistrations')
            .where('eventoccurrenceid', id)
            .del();

        // Delete event occurrence
        await knexInstance('eventoccurrences')
            .where('eventoccurrenceid', id)
            .del();

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

router.get('/surveys', requireAuth, requireManager, async (req, res) => {
    try {
        const surveys = await knexInstance("surveys as s")
            .leftJoin("eventregistrations as er", "s.registrationid", "er.registrationid")
            .leftJoin("people as p", "er.personid", "p.personid")
            .leftJoin("eventoccurrences as eo", "er.eventoccurrenceid", "eo.eventoccurrenceid")
            .select(
                "s.surveyid",
                "s.surveysubmissiondate",
                "s.surveysatisfactionscore",
                "s.surveyusefulnessscore",
                "s.surveyinstructorscore",
                "s.surveyrecommendationscore",
                "s.surveyoverallscore",
                "s.surveycomments",
                knexInstance.raw("COALESCE(p.firstname || ' ' || p.lastname, 'Unknown') AS participantname"),
                "eo.eventname",
                knexInstance.raw("TO_CHAR(eo.eventdatetimestart, 'YYYY-MM-DD') AS eventdate")
            )
            .orderBy("s.surveyid", "desc");

        res.render("manager/surveys", {
            title: "Completed Surveys",
            user: req.session.user,
            surveys: surveys || []
        });

    } catch (err) {
        console.error("Error loading surveys list:", err);
        req.session.messages = [{ type: "error", text: "Error loading surveys list: " + err.message }];
        res.redirect("/");
    }
});

router.get('/user/surveys/:registrationid', requireAuth, async (req, res) => {
    const { registrationid } = req.params;

    try {
        // Check registration exists
        const registration = await knexInstance("eventregistrations")
            .where("registrationid", registrationid)
            .first();

        if (!registration) {
            return res.redirect('/user/dashboard');
        }

        // Prevent duplicate submissions
        const existing = await knexInstance("surveys")
            .where("registrationid", registrationid)
            .first();

        if (existing) {
            req.session.messages = [{ type: 'error', text: 'You have already submitted this survey.' }];
            return res.redirect('/user/dashboard');
        }

        res.render("user/surveys", {
            user: req.session.user,
            registration
        });

    } catch (err) {
        console.error("Error loading survey form:", err);
        res.redirect('/user/dashboard');
    }
});

router.post('/user/surveys/submit', requireAuth, async (req, res) => {
    const {
        registrationid,
        surveysatisfactionscore,
        surveyusefulnessscore,
        surveyinstructorscore,
        surveyrecommendationscore,
        surveyoverallscore,
        surveycomments
    } = req.body;

    try {
        // Auto NPS bucket based on overall score
        let bucket = "Neutral";
        if (surveyoverallscore >= 4) bucket = "Promoter";
        else if (surveyoverallscore <= 2) bucket = "Detractor";

        await knexInstance("surveys").insert({
            registrationid,
            surveysubmissiondate: knexInstance.fn.now(),
            surveysatisfactionscore,
            surveyusefulnessscore,
            surveyinstructorscore,
            surveyrecommendationscore,
            surveyoverallscore,
            surveycomments,
            surveynpsbucket: bucket
        });

        req.session.messages = [{ type: 'success', text: 'Survey submitted successfully.' }];
        res.redirect('/user/dashboard');

    } catch (err) {
        console.error("Error submitting survey:", err);
        req.session.messages = [{ type: 'error', text: 'Error submitting survey: ' + err.message }];
        res.redirect('/user/dashboard');
    }
});


// OLD DUPLICATE ROUTES REMOVED - Using the updated routes below


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
            
            // Load survey questions from surveys table for each event occurrence
            const eventOccurrenceIds = registrations.map(r => r.EventOccurrenceID || r.eventoccurrenceid);
            const allSurveyQuestions = await knexInstance('surveys')
                .whereIn('eventid', eventOccurrenceIds)
                .select('eventid', 'question')
                .orderBy('surveyid');
            
            // Group questions by eventid
            const questionsByEventId = {};
            allSurveyQuestions.forEach(q => {
                const eventId = q.eventid;
                if (!questionsByEventId[eventId]) {
                    questionsByEventId[eventId] = [];
                }
                questionsByEventId[eventId].push(q.question);
            });
            
            // Map registrations to events with surveys
            const eventsWithSurveys = registrations.map(reg => {
                const eventOccurrenceId = reg.EventOccurrenceID || reg.eventoccurrenceid;
                const questions = questionsByEventId[eventOccurrenceId] || [];
                const hasCompleted = completedRegistrationIds.has(reg.RegistrationID || reg.registrationid);
                
                return {
                    EventOccurrenceID: eventOccurrenceId,
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

// GET Route: Survey Builder
router.get('/surveys/builder', requireAuth, requireManager, async (req, res) => {
    const { eventid } = req.query;

    try {
        // Load all events for dropdown
        const events = await knexInstance("eventoccurrences")
            .select("eventoccurrenceid", "eventname", "eventdatetimestart", "eventlocation")
            .orderBy("eventdatetimestart", "desc");

        let questions = [];
        let selectedEvent = null;

        if (eventid) {
            selectedEvent = events.find(e => e.eventoccurrenceid == eventid);

            // Load survey questions from surveys table where eventid = eventoccurrenceid
            questions = await knexInstance("surveys")
                .where("eventid", eventid)
                .select("surveyid", "question")
                .orderBy("surveyid");
        }

        res.render("manager/survey-builder", {
            title: "Survey Builder",
            user: req.session.user,
            events,
            selectedEvent,
            questions
        });

    } catch (err) {
        console.error("Error loading survey builder:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading survey builder: ' + err.message }];
        res.redirect("/surveys");
    }
});

// GET: Create Survey (Select Event Only)
router.get('/surveys/builder', requireAuth, requireManager, async (req, res) => {
    try {
        // Load all event occurrences
        const events = await knexInstance("eventoccurrences")
            .select("eventoccurrenceid", "eventname", "eventdatetimestart")
            .orderBy("eventdatetimestart", "desc");

        res.render("manager/survey-builder", {
            title: "Create Survey",
            user: req.session.user,
            events
        });

    } catch (err) {
        console.error("Error loading survey creator:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading survey creator.' }];
        res.redirect("/surveys");
    }
});


// POST: Create Survey for Selected Event
router.post('/surveys/builder/save', requireAuth, requireManager, async (req, res) => {
    const { eventid } = req.body;

    try {
        if (!eventid) {
            req.session.messages = [{ type: "error", text: "Please select an event." }];
            return res.redirect("/surveys/builder");
        }

        // Ensure event exists
        const eventExists = await knexInstance("eventoccurrences")
            .where("eventoccurrenceid", eventid)
            .first();

        if (!eventExists) {
            req.session.messages = [{ type: "error", text: "Selected event does not exist." }];
            return res.redirect("/surveys/builder");
        }

        // Check if survey already exists for this event
        const existing = await knexInstance("surveys")
            .where("eventid", eventid)
            .first();

        if (!existing) {
            // Create empty survey shell
            await knexInstance("surveys").insert({
                eventid: eventid,
                question: null   // no questions yet
            });
        }

        req.session.messages = [
            { type: "success", text: "Survey created for event." }
        ];

        return res.redirect("/surveys");

    } catch (err) {
        console.error("Error creating survey:", err);
        req.session.messages = [{ type: "error", text: "Error creating survey." }];
        res.redirect("/surveys/builder");
    }
});


router.get('/surveys/new', requireAuth, requireManager, async (req, res) => {
    try {
        // Get all events (search by eventname or eventtemplateid, NOT by people)
        // Join chain: EventOccurrences → EventTemplate
        const events = await knexInstance('EventOccurrences as eo')
            .leftJoin('EventTemplate as et', 'eo.EventTemplateID', 'et.EventTemplateID')
            .select(
                'eo.EventOccurrenceID as eventoccurrenceid',
                'eo.EventName as eventname',
                'eo.EventDateTimeStart',
                'et.EventTemplateID as eventtemplateid',
                'et.EventName as templatename',
                'et.EventDescription'
            )
            .orderBy('eo.EventDateTimeStart', 'desc');
        
        // Format events for dropdown (remove empty parentheses)
        const eventOptions = events.map(event => {
            const eventName = event.eventname || event.templatename || 'Event';
            const eventDate = event.EventDateTimeStart ? new Date(event.EventDateTimeStart).toLocaleDateString() : '';
            
            // Only show secondary label if it exists and is different from event name
            let displayName = eventName;
            if (event.templatename && event.templatename !== eventName) {
                displayName = `${eventName} (${event.templatename})`;
            }
            
            return {
                eventoccurrenceid: event.eventoccurrenceid,
                eventname: displayName,
                eventdate: eventDate,
                eventtemplateid: event.eventtemplateid
            };
        });
        
        res.render('manager/surveys-add', {
            title: 'Add Survey',
            user: req.session.user || null,
            events: eventOptions || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching data for survey form:', error);
        req.session.messages = [{ type: 'error', text: 'Error loading survey form: ' + error.message }];
        res.render('manager/surveys-add', {
            title: 'Add Survey',
            user: req.session.user || null,
            events: [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    }
});

router.post('/surveys/new', requireAuth, requireManager, async (req, res) => {
    const { eventoccurrenceid } = req.body;
    
    // Validate required fields
    if (!eventoccurrenceid) {
        req.session.messages = [{ type: 'error', text: 'Event is required.' }];
        return res.redirect('/surveys/new');
    }
    
    try {
        // Verify event exists
        const event = await knexInstance('EventOccurrences')
            .where('EventOccurrenceID', eventoccurrenceid)
            .first();
        
        if (!event) {
            req.session.messages = [{ type: 'error', text: 'Event not found.' }];
            return res.redirect('/surveys/new');
        }
        
        // Check if survey template already exists for this event (using lowercase table name)
        const existingSurvey = await knexInstance('surveys')
            .where('eventid', eventoccurrenceid)
            .first();
        
        if (existingSurvey) {
            req.session.messages = [{ type: 'error', text: 'A survey template already exists for this event.' }];
            return res.redirect('/surveys/new');
        }
        
        // Insert new survey template for this event (even if it's the first one)
        // Use lowercase table name to match schema
        await knexInstance('surveys').insert({
            eventid: eventoccurrenceid,
            question: null  // No questions yet, admin can add them later
        });
        
        req.session.messages = [{ type: 'success', text: 'Survey template created successfully for this event.' }];
        return res.redirect('/surveys');
    } catch (error) {
        console.error('Error creating survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error creating survey: ' + error.message }];
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
        
        // Load survey questions from surveys table where eventid = eventoccurrenceid
        const questionsData = await knexInstance('surveys')
            .where('eventid', eventId)
            .select('question')
            .orderBy('surveyid');
        
        const questions = questionsData.map(q => q.question);
        
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

// Edit survey routes removed - surveys are not editable after creation
// router.get('/surveys/:id/edit', requireAuth, async (req, res) => {
//     // Removed - no editing functionality
// });

// router.post('/surveys/:id/update', requireAuth, async (req, res) => {
//     // Removed - no editing functionality
// });

router.post('/surveys/:id/delete', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;
    try {
        // Verify survey exists
        const survey = await knexInstance('surveys')
            .where('surveyid', id)
            .first();

        if (!survey) {
            req.session.messages = [{ type: 'error', text: 'Survey not found.' }];
            return res.redirect('/surveys');
        }

        // Delete the survey
        await knexInstance('surveys')
            .where('surveyid', id)
            .del();

        req.session.messages = [{ type: 'success', text: 'Survey deleted successfully.' }];
        res.redirect('/surveys');
    } catch (error) {
        console.error('Error deleting survey:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting survey: ' + error.message }];
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
            // Managers see individual milestones with edit capability
            milestones = await knexInstance('milestones')
                .join('people', 'milestones.personid', 'people.personid')
                .join('peopleroles', 'people.personid', 'peopleroles.personid')
                .join('roles', 'peopleroles.roleid', 'roles.roleid')
                .where('roles.rolename', 'Participant')
                .select(
                    'milestones.milestoneid',
                    'milestones.milestonetitle',
                    'milestones.milestonedate',
                    'people.firstname',
                    'people.lastname',
                    'people.email'
                )
                .orderBy('milestones.milestonedate', 'desc');
        } else {
            // Regular users see only their own milestones
            const userId = user.id;
            milestones = await knexInstance('milestones')
                .join('people', 'milestones.personid', 'people.personid')
                .where('milestones.personid', userId)
                .select('milestones.*', 'people.firstname', 'people.lastname')
                .orderBy('milestones.milestonedate', 'desc');
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
        // Insert into milestones table
        const milestoneDate = new Date(achievement_date);
        
        try {
            await knexInstance('milestones')
                .insert({
                    personid: personId,
                    milestonetitle: milestone_name,
                    milestonedate: milestoneDate
                });
        } catch (insertError) {
            // If insert fails due to sequence issue, reset sequence and retry
            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                // Get max ID and reset sequence
                const maxIdResult = await knexInstance('milestones')
                    .max('milestoneid as max_id')
                    .first();
                
                const maxId = maxIdResult?.max_id || 0;
                await knexInstance.raw(`SELECT setval('milestones_milestoneid_seq', ${maxId}, true)`);
                
                // Try insert again
                await knexInstance('milestones')
                    .insert({
                        personid: personId,
                        milestonetitle: milestone_name,
                        milestonedate: milestoneDate
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

// GET Route: Load Unique Milestone Titles + Participants
router.get('/milestones/add', requireAuth, requireManager, async (req, res) => {
    try {
        const selectedPersonId = req.query.personid || null;

        // Get unique milestone titles from existing milestones
        const milestoneOptions = await knexInstance("milestones")
            .distinct("milestonetitle")
            .whereNotNull("milestonetitle")
            .orderBy("milestonetitle");

        // Get all participants
        const participants = await knexInstance("people")
            .select("personid", "firstname", "lastname", "email")
            .orderBy("lastname");

        // If personid is provided, get that specific participant
        let selectedParticipant = null;
        if (selectedPersonId) {
            selectedParticipant = await knexInstance("people")
                .select("personid", "firstname", "lastname", "email")
                .where("personid", selectedPersonId)
                .first();
        }

        res.render("manager/milestones-add", {
            title: "Add Milestone",
            user: req.session.user,
            milestoneOptions: milestoneOptions || [],
            participants,
            selectedPersonId,
            selectedParticipant
        });

    } catch (err) {
        console.error("Error loading add milestone:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading milestone form: ' + err.message }];
        res.redirect("/milestones");
    }
});


// POST Route: Insert Milestone
router.post('/milestones/add', requireAuth, requireManager, async (req, res) => {
    const { personid, milestonetitle, milestonedate } = req.body;

    // Validate required fields
    if (!personid || !milestonetitle) {
        req.session.messages = [{ type: 'error', text: 'Person and milestone title are required.' }];
        return res.redirect("/milestones/add");
    }

    try {
        // Verify person exists
        const person = await knexInstance("people")
            .where("personid", personid)
            .first();

        if (!person) {
            req.session.messages = [{ type: 'error', text: 'Selected person not found.' }];
            return res.redirect("/milestones/add");
        }

        // Use today's date if not provided
        const milestoneDate = milestonedate || new Date().toISOString().slice(0, 10);

        // Fix auto-increment: Get max ID and set sequence
        try {
            const maxIdResult = await knexInstance("milestones")
                .max("milestoneid as max_id")
                .first();
            
            const maxId = maxIdResult?.max_id || 0;
            await knexInstance.raw(`SELECT setval('milestones_milestoneid_seq', ${maxId}, true)`);
        } catch (seqError) {
            // If sequence doesn't exist or table is empty, that's okay
            console.log("Sequence reset skipped (may be first insert):", seqError.message);
        }

        // Insert milestone
        await knexInstance("milestones").insert({
            personid: parseInt(personid),
            milestonetitle: milestonetitle.trim(),
            milestonedate: milestoneDate
        });

        req.session.messages = [{ type: 'success', text: 'Milestone added successfully.' }];
        res.redirect("/milestones");

    } catch (err) {
        console.error("Error adding milestone:", err);
        req.session.messages = [{ type: 'error', text: 'Error adding milestone: ' + err.message }];
        res.redirect("/milestones/add");
    }
});

// GET Route: Manage Milestones for a Person
router.get('/milestones/manage/:personid', requireAuth, requireManager, async (req, res) => {
    const { personid } = req.params;

    try {
        const person = await knexInstance("people")
            .select("personid", "firstname", "lastname", "email")
            .where("personid", personid)
            .first();

        if (!person) {
            req.session.messages = [{ type: 'error', text: 'Person not found.' }];
            return res.redirect("/milestones");
        }

        const milestones = await knexInstance("milestones")
            .select("milestoneid", "milestonetitle", "milestonedate")
            .where("personid", personid)
            .orderBy("milestonedate", "desc");

        res.render("manager/milestones-manage", {
            title: "Manage Milestones",
            user: req.session.user,
            person,
            milestones
        });

    } catch (err) {
        console.error("Error loading milestone manager:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading milestones: ' + err.message }];
        res.redirect("/milestones");
    }
});

// GET Route: Edit Milestone
router.get('/milestones/edit/:milestoneid', requireAuth, requireManager, async (req, res) => {
    const { milestoneid } = req.params;

    try {
        const milestone = await knexInstance("milestones")
            .select("milestoneid", "personid", "milestonetitle", "milestonedate")
            .where("milestoneid", milestoneid)
            .first();

        if (!milestone) {
            req.session.messages = [{ type: 'error', text: 'Milestone not found.' }];
            return res.redirect("/milestones");
        }

        const person = await knexInstance("people")
            .select("personid", "firstname", "lastname", "email")
            .where("personid", milestone.personid)
            .first();

        if (!person) {
            req.session.messages = [{ type: 'error', text: 'Person not found.' }];
            return res.redirect("/milestones");
        }

        // Get distinct milestone titles for dropdown
        const milestoneOptions = await knexInstance("milestones")
            .distinct("milestonetitle")
            .orderBy("milestonetitle");

        res.render("manager/milestones-edit", {
            title: "Edit Milestone",
            user: req.session.user,
            milestone,
            person,
            milestoneOptions
        });

    } catch (err) {
        console.error("Error loading milestone edit:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading milestone: ' + err.message }];
        res.redirect("/milestones");
    }
});

// POST Route: Update Milestone
router.post('/milestones/edit/:milestoneid', requireAuth, requireManager, async (req, res) => {
    const { milestoneid } = req.params;
    const { milestonetitle, milestonedate } = req.body;

    try {
        // Get personid before update for redirect
        const milestone = await knexInstance("milestones")
            .select("personid")
            .where("milestoneid", milestoneid)
            .first();

        if (!milestone) {
            req.session.messages = [{ type: 'error', text: 'Milestone not found.' }];
            return res.redirect("/milestones");
        }

        // Parse the date string (YYYY-MM-DD format from date input) properly
        let parsedDate = null;
        if (milestonedate) {
            // Date input sends YYYY-MM-DD format, create date at midnight UTC to avoid timezone issues
            parsedDate = new Date(milestonedate + 'T00:00:00');
        }

        await knexInstance("milestones")
            .where("milestoneid", milestoneid)
            .update({
                milestonetitle,
                milestonedate: parsedDate
            });

        req.session.messages = [{ type: 'success', text: 'Milestone updated successfully' }];
        res.redirect("/milestones");

    } catch (err) {
        console.error("Error updating milestone:", err);
        req.session.messages = [{ type: 'error', text: 'Error updating milestone: ' + err.message }];
        res.redirect(`/milestones/edit/${milestoneid}`);
    }
});

// POST Route: Delete Milestone
router.post('/milestones/delete/:milestoneid', requireAuth, requireManager, async (req, res) => {
    const { milestoneid } = req.params;

    try {
        // find the person so we can redirect back correctly
        const record = await knexInstance("milestones")
            .select("personid")
            .where("milestoneid", milestoneid)
            .first();

        if (!record) return res.redirect("/milestones");

        await knexInstance("milestones")
            .where("milestoneid", milestoneid)
            .del();

        req.session.messages = [{ type: 'success', text: 'Milestone deleted successfully' }];
        res.redirect("/milestones");

    } catch (err) {
        console.error("Error deleting milestone:", err);
        res.redirect("/milestones");
    }
});

router.get('/milestones/:id/edit', requireAuth, async (req, res) => {
    if (req.session.user.role !== 'manager') {
        return res.status(403).send('Access denied.');
    }
    const { id } = req.params;
    try {
        const milestoneData = await knexInstance('milestones').where({ milestoneid: id }).first();
        
        if (!milestoneData) {
            req.session.messages = [{ type: 'error', text: 'Milestone not found.' }];
            return res.redirect('/milestones');
        }
        
        // Fetch participants from database (matching FInalTableCreation.sql schema)
        const participants = await knexInstance('people')
            .join('peopleroles', 'people.personid', 'peopleroles.personid')
            .join('roles', 'peopleroles.roleid', 'roles.roleid')
            .where('roles.rolename', 'Participant')
            .select('people.personid', 'people.firstname', 'people.lastname', 'people.email')
            .orderBy('people.lastname', 'asc');
        
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
        // Get donations - use lowercase table names
        const donations = await knexInstance('donations')
            .leftJoin('people', 'donations.personid', 'people.personid')
            .select(
                'donations.donationid',
                'donations.personid',
                'donations.donationdate',
                'donations.donationamount',
                'people.firstname',
                'people.lastname',
                'people.email'
            )
            .orderBy('donations.donationdate', 'desc');
        
        // Format dates using helper function
        const formattedDonations = donations.map(d => ({
            ...d,
            formatted_date: formatDate(d.donationdate)
        }));
        
        res.render(viewPath, {
            title: 'Donations - Ella Rises',
            user: user,
            donations: formattedDonations || [],
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

router.get('/donations/new', requireAuth, requireManager, (req, res) => {
    res.render('manager/donations-form', {
        title: 'Add New Donation - Ella Rises',
        user: req.session.user,
        messages: req.session.messages || []
    });
    req.session.messages = [];
});

// GET route for people search autocomplete
router.get('/people/search', requireAuth, requireManager, async (req, res) => {
    try {
        const q = req.query.q || '';

        if (!q || q.trim().length === 0) {
            return res.json([]);
        }

        const results = await knexInstance('people')
            .whereILike('firstname', `%${q}%`)
            .orWhereILike('lastname', `%${q}%`)
            .orWhereILike('email', `%${q}%`)
            .select('personid', 'firstname', 'lastname', 'email')
            .limit(10);

        res.json(results);
    } catch (err) {
        console.error("Search error:", err);
        res.json([]);
    }
});

router.post('/donations/add', requireAuth, requireManager, async (req, res) => {
    try {
        const {
            personid,
            new_firstname,
            new_lastname,
            new_email,
            new_phone,
            new_city,
            new_state,
            new_zip,
            new_country,
            amount,
            donationdate
        } = req.body;

        // Validation: Cannot have both existing person AND new person fields filled
        const hasExistingPerson = personid && personid.trim() !== '';
        const hasNewPersonFields = (new_firstname && new_firstname.trim() !== '') || 
                                   (new_lastname && new_lastname.trim() !== '') || 
                                   (new_email && new_email.trim() !== '');

        if (hasExistingPerson && hasNewPersonFields) {
            req.session.messages = [{ type: 'error', text: 'Please choose either an existing person OR create a new person, not both.' }];
            return res.redirect('/donations/new');
        }

        if (!hasExistingPerson && !hasNewPersonFields) {
            req.session.messages = [{ type: 'error', text: 'Please select an existing person or create a new one.' }];
            return res.redirect('/donations/new');
        }

        let finalPersonId = personid;

        // If no existing person was selected, create a new one
        if (!finalPersonId || finalPersonId === "") {
            if (!new_firstname || !new_lastname || !new_email) {
                req.session.messages = [{ type: 'error', text: 'First name, last name, and email are required for new donors.' }];
                return res.redirect('/donations/new');
            }

            const inserted = await knexInstance('people')
                .insert({
                    firstname: new_firstname.trim(),
                    lastname: new_lastname.trim(),
                    email: new_email.trim(),
                    phonenumber: new_phone || '',
                    city: new_city || '',
                    state: new_state || '',
                    zip: new_zip || '',
                    country: new_country || ''
                })
                .returning(['personid']);

            finalPersonId = inserted[0].personid;

            // Ensure new donor has Participant role in PeopleRoles
            const existingRole = await knexInstance('peopleroles')
                .where('personid', finalPersonId)
                .where('roleid', 1) // RoleID 1 = Participant
                .first();

            if (!existingRole) {
                await knexInstance('peopleroles').insert({
                    personid: finalPersonId,
                    roleid: 1 // Participant role
                });
            }
        }

        // Format date: Use YYYY-MM-DD HH:MM:SS format
        let formattedDate;
        if (donationdate) {
            // If date is provided, combine with current time for timestamp
            const dateObj = new Date(donationdate);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            // Format as PostgreSQL timestamp string: YYYY-MM-DD HH:MM:SS
            formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } else {
            // Use current timestamp - PostgreSQL will handle NOW()
            formattedDate = knexInstance.raw('NOW()');
        }

        // Insert donation
        await knexInstance('donations').insert({
            personid: finalPersonId,
            donationamount: parseFloat(amount) || 0,
            donationdate: formattedDate
        });

        req.session.messages = [{ type: 'success', text: 'Donation added successfully.' }];
        res.redirect('/donations');
    } catch (err) {
        console.error("Error adding donation:", err);
        req.session.messages = [{ type: 'error', text: 'Error adding donation: ' + err.message }];
        res.redirect('/donations/new');
    }
});

router.get('/donations/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    try {
        const donation = await knexInstance("donations as d")
            .leftJoin("people as p", "p.personid", "d.personid")
            .where("d.donationid", id)
            .select(
                "d.donationid",
                "d.donationamount",
                "d.donationdate",
                "p.firstname",
                "p.lastname",
                "p.email"
            )
            .first();

        if (!donation) {
            req.session.messages = [{ type: 'error', text: 'Donation not found.' }];
            return res.redirect('/donations');
        }

        // Format date for the form
        const formattedDonation = {
            ...donation,
            formatted_date: formatDate(donation.donationdate)
        };

        res.render("manager/donations-edit", {
            title: "Edit Donation",
            user: req.session.user,
            donation: formattedDonation,
            messages: req.session.messages || []
        });
        req.session.messages = [];

    } catch (err) {
        console.error("Error loading donation:", err);
        req.session.messages = [{ type: 'error', text: 'Error loading donation: ' + err.message }];
        return res.redirect("/donations");
    }
});

router.post('/donations/edit/:id', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;

    const {
        amount,
        donationdate
    } = req.body;

    try {
        // Ensure valid date format
        const formattedDate = donationdate ? new Date(donationdate).toISOString().slice(0, 10) : null;

        await knexInstance("donations")
            .where("donationid", id)
            .update({
                donationamount: amount ? parseFloat(amount) : null,
                donationdate: formattedDate
            });

        req.session.messages = [{ type: 'success', text: 'Donation updated successfully.' }];
        res.redirect("/donations");

    } catch (err) {
        console.error("Error updating donation:", err);
        req.session.messages = [{ type: 'error', text: 'Error updating donation: ' + err.message }];
        res.redirect("/donations/edit/" + id);
    }
});

router.post('/donations/:id/delete', requireAuth, requireManager, async (req, res) => {
    const { id } = req.params;
    try {
        await knexInstance('donations')
            .where('donationid', id)
            .del();
        req.session.messages = [{ type: 'success', text: 'Donation deleted successfully.' }];
        res.redirect('/donations');
    } catch (error) {
        console.error('Error deleting donation:', error);
        req.session.messages = [{ type: 'error', text: 'Error deleting donation: ' + error.message }];
        res.redirect('/donations');
    }
});

// ============================================================================
// USER MAINTENANCE DASHBOARD
// ============================================================================

// GET /user-maintenance - Main dashboard page
router.get('/user-maintenance', requireAuth, requireManager, async (req, res) => {
    try {
        // Get Admins
        const admins = await knexInstance('People as p')
            .join('PeopleRoles as pr', 'p.PersonID', 'pr.PersonID')
            .join('Roles as r', 'pr.RoleID', 'r.RoleID')
            .where('r.RoleName', 'Admin')
            .select('p.PersonID as personid', 'p.FirstName as firstname', 'p.LastName as lastname', 'p.Email as email')
            .orderBy('p.LastName', 'asc')
            .orderBy('p.FirstName', 'asc');

        // Get Volunteers
        const volunteers = await knexInstance('People as p')
            .join('PeopleRoles as pr', 'p.PersonID', 'pr.PersonID')
            .join('Roles as r', 'pr.RoleID', 'r.RoleID')
            .where('r.RoleName', 'Volunteer')
            .select('p.PersonID as personid', 'p.FirstName as firstname', 'p.LastName as lastname', 'p.Email as email')
            .orderBy('p.LastName', 'asc')
            .orderBy('p.FirstName', 'asc');

        res.render('manager/user-maintenance', {
            title: 'User Maintenance',
            user: req.session.user || null,
            admins: admins || [],
            volunteers: volunteers || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (error) {
        console.error('Error fetching user maintenance data:', error);
        res.render('manager/user-maintenance', {
            title: 'User Maintenance',
            user: req.session.user || null,
            admins: [],
            volunteers: [],
            messages: [{ type: 'error', text: 'Error loading user maintenance data.' }]
        });
        req.session.messages = [];
    }
});

// GET /user-maintenance/search/admin - Search API for admins
router.get('/user-maintenance/search/admin', requireAuth, requireManager, async (req, res) => {
    try {
        const term = req.query.term || '';
        
        if (!term || term.trim().length === 0) {
            return res.json([]);
        }

        const results = await knexInstance('People')
            .whereRaw("LOWER(FirstName || ' ' || LastName) LIKE ?", [`%${term.toLowerCase()}%`])
            .select('PersonID as personid', 'FirstName as firstname', 'LastName as lastname', 'Email as email')
            .orderBy('LastName', 'asc')
            .orderBy('FirstName', 'asc')
            .limit(8);

        const formatted = results.map(row => ({
            personid: row.personid,
            name: `${row.firstname || ''} ${row.lastname || ''}`.trim(),
            email: row.email || ''
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error searching for admin:', error);
        res.json([]);
    }
});

// GET /user-maintenance/search/volunteer - Search API for volunteers
router.get('/user-maintenance/search/volunteer', requireAuth, requireManager, async (req, res) => {
    try {
        const term = req.query.term || '';
        
        if (!term || term.trim().length === 0) {
            return res.json([]);
        }

        const results = await knexInstance('People')
            .whereRaw("LOWER(FirstName || ' ' || LastName) LIKE ?", [`%${term.toLowerCase()}%`])
            .select('PersonID as personid', 'FirstName as firstname', 'LastName as lastname', 'Email as email')
            .orderBy('LastName', 'asc')
            .orderBy('FirstName', 'asc')
            .limit(8);

        const formatted = results.map(row => ({
            personid: row.personid,
            name: `${row.firstname || ''} ${row.lastname || ''}`.trim(),
            email: row.email || ''
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error searching for volunteer:', error);
        res.json([]);
    }
});

// POST /user-maintenance/add-admin - Add admin role
router.post('/user-maintenance/add-admin', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/user-maintenance');
        }

        // Get Admin roleid
        const adminRole = await knexInstance('Roles')
            .where('RoleName', 'Admin')
            .first();

        if (!adminRole) {
            req.session.messages = [{ type: 'error', text: 'Admin role not found in database.' }];
            return res.redirect('/user-maintenance');
        }

        // Insert with ON CONFLICT DO NOTHING (using raw SQL for PostgreSQL)
        await knexInstance.raw(`
            INSERT INTO "PeopleRoles" ("PersonID", "RoleID")
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
        `, [personid, adminRole.RoleID]);

        req.session.messages = [{ type: 'success', text: 'Admin role added successfully.' }];
        res.redirect('/user-maintenance');
    } catch (error) {
        console.error('Error adding admin role:', error);
        req.session.messages = [{ type: 'error', text: 'Error adding admin role: ' + error.message }];
        res.redirect('/user-maintenance');
    }
});

// POST /user-maintenance/add-volunteer - Add volunteer role
router.post('/user-maintenance/add-volunteer', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/user-maintenance');
        }

        // Get Volunteer roleid
        const volunteerRole = await knexInstance('Roles')
            .where('RoleName', 'Volunteer')
            .first();

        if (!volunteerRole) {
            req.session.messages = [{ type: 'error', text: 'Volunteer role not found in database.' }];
            return res.redirect('/user-maintenance');
        }

        // Insert with ON CONFLICT DO NOTHING
        await knexInstance.raw(`
            INSERT INTO "PeopleRoles" ("PersonID", "RoleID")
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
        `, [personid, volunteerRole.RoleID]);

        req.session.messages = [{ type: 'success', text: 'Volunteer role added successfully.' }];
        res.redirect('/user-maintenance');
    } catch (error) {
        console.error('Error adding volunteer role:', error);
        req.session.messages = [{ type: 'error', text: 'Error adding volunteer role: ' + error.message }];
        res.redirect('/user-maintenance');
    }
});

// POST /user-maintenance/remove-admin - Remove admin role
router.post('/user-maintenance/remove-admin', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/user-maintenance');
        }

        // Get Admin roleid
        const adminRole = await knexInstance('Roles')
            .where('RoleName', 'Admin')
            .first();

        if (!adminRole) {
            req.session.messages = [{ type: 'error', text: 'Admin role not found in database.' }];
            return res.redirect('/user-maintenance');
        }

        // Delete the role assignment
        await knexInstance('PeopleRoles')
            .where('PersonID', personid)
            .where('RoleID', adminRole.RoleID)
            .del();

        req.session.messages = [{ type: 'success', text: 'Admin role removed successfully.' }];
        res.redirect('/user-maintenance');
    } catch (error) {
        console.error('Error removing admin role:', error);
        req.session.messages = [{ type: 'error', text: 'Error removing admin role: ' + error.message }];
        res.redirect('/user-maintenance');
    }
});

// POST /user-maintenance/remove-volunteer - Remove volunteer role
router.post('/user-maintenance/remove-volunteer', requireAuth, requireManager, async (req, res) => {
    try {
        const { personid } = req.body;

        if (!personid) {
            req.session.messages = [{ type: 'error', text: 'Person ID is required.' }];
            return res.redirect('/user-maintenance');
        }

        // Get Volunteer roleid
        const volunteerRole = await knexInstance('Roles')
            .where('RoleName', 'Volunteer')
            .first();

        if (!volunteerRole) {
            req.session.messages = [{ type: 'error', text: 'Volunteer role not found in database.' }];
            return res.redirect('/user-maintenance');
        }

        // Delete the role assignment
        await knexInstance('PeopleRoles')
            .where('PersonID', personid)
            .where('RoleID', volunteerRole.RoleID)
            .del();

        req.session.messages = [{ type: 'success', text: 'Volunteer role removed successfully.' }];
        res.redirect('/user-maintenance');
    } catch (error) {
        console.error('Error removing volunteer role:', error);
        req.session.messages = [{ type: 'error', text: 'Error removing volunteer role: ' + error.message }];
        res.redirect('/user-maintenance');
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

