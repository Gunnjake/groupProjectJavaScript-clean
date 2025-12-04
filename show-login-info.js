// Script to show login credentials for admin, volunteer, and participant accounts
const db = require('./db');

async function showLoginInfo() {
    try {
        console.log('='.repeat(80));
        console.log('LOGIN CREDENTIALS - Admin, Volunteer, and Participant Accounts');
        console.log('='.repeat(80));
        console.log('');

        // Get Admin accounts
        console.log('ADMIN ACCOUNTS:');
        console.log('─'.repeat(80));
        try {
            const admins = await db('People')
                .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
                .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
                .join('AdminDetails', 'People.PersonID', 'AdminDetails.PersonID')
                .where('Roles.RoleName', 'Admin')
                .select(
                    'People.PersonID',
                    'People.Email',
                    'People.FirstName',
                    'People.LastName',
                    'AdminDetails.Password',
                    'AdminDetails.AdminRole'
                );
            
            if (admins.length > 0) {
                admins.forEach((admin, idx) => {
                    console.log(`\nAdmin ${idx + 1}:`);
                    console.log(`  PersonID: ${admin.PersonID || admin.personid}`);
                    console.log(`  Email (Username): ${admin.Email || admin.email}`);
                    console.log(`  Name: ${admin.FirstName || admin.firstname} ${admin.LastName || admin.lastname}`);
                    console.log(`  Password: ${admin.Password || admin.password || 'NOT SET'}`);
                    console.log(`  Admin Role: ${admin.AdminRole || admin.adminrole || 'N/A'}`);
                });
            } else {
                console.log('  No admin accounts found');
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }

        // Get Volunteer accounts
        console.log('\n\nVOLUNTEER ACCOUNTS:');
        console.log('─'.repeat(80));
        try {
            const volunteers = await db('People')
                .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
                .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
                .join('VolunteerDetails', 'People.PersonID', 'VolunteerDetails.PersonID')
                .where('Roles.RoleName', 'Volunteer')
                .select(
                    'People.PersonID',
                    'People.Email',
                    'People.FirstName',
                    'People.LastName',
                    'VolunteerDetails.Password',
                    'VolunteerDetails.VolunteerRole'
                );
            
            if (volunteers.length > 0) {
                volunteers.forEach((volunteer, idx) => {
                    console.log(`\nVolunteer ${idx + 1}:`);
                    console.log(`  PersonID: ${volunteer.PersonID || volunteer.personid}`);
                    console.log(`  Email (Username): ${volunteer.Email || volunteer.email}`);
                    console.log(`  Name: ${volunteer.FirstName || volunteer.firstname} ${volunteer.LastName || volunteer.lastname}`);
                    console.log(`  Password: ${volunteer.Password || volunteer.password || 'NOT SET'}`);
                    console.log(`  Volunteer Role: ${volunteer.VolunteerRole || volunteer.volunteerrole || 'N/A'}`);
                });
            } else {
                console.log('  No volunteer accounts found');
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }

        // Get Participant accounts
        console.log('\n\nPARTICIPANT ACCOUNTS:');
        console.log('─'.repeat(80));
        try {
            const participants = await db('People')
                .join('PeopleRoles', 'People.PersonID', 'PeopleRoles.PersonID')
                .join('Roles', 'PeopleRoles.RoleID', 'Roles.RoleID')
                .join('ParticipantDetails', 'People.PersonID', 'ParticipantDetails.PersonID')
                .where('Roles.RoleName', 'Participant')
                .select(
                    'People.PersonID',
                    'People.Email',
                    'People.FirstName',
                    'People.LastName',
                    'ParticipantDetails.Password'
                )
                .limit(20);
            
            if (participants.length > 0) {
                participants.forEach((participant, idx) => {
                    console.log(`\nParticipant ${idx + 1}:`);
                    console.log(`  PersonID: ${participant.PersonID || participant.personid}`);
                    console.log(`  Email (Username): ${participant.Email || participant.email}`);
                    console.log(`  Name: ${participant.FirstName || participant.firstname} ${participant.LastName || participant.lastname}`);
                    console.log(`  Password: ${participant.Password || participant.password || 'NOT SET'}`);
                });
                if (participants.length >= 20) {
                    console.log('\n  ... (showing first 20 participants)');
                }
            } else {
                console.log('  No participant accounts found');
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('LOGIN INSTRUCTIONS:');
        console.log('='.repeat(80));
        console.log('1. Go to /login page');
        console.log('2. Enter the Email (Username) from above');
        console.log('3. Enter the Password from above');
        console.log('4. Click Login');
        console.log('='.repeat(80));

        await db.destroy();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

showLoginInfo();



