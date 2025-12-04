// Direct SQL queries to check for data
const db = require('./db');

async function queryDirect() {
    try {
        console.log('Direct database queries to check for data...\n');
        
        // Try querying People table directly
        console.log('1. Querying People table:');
        const people = await db.raw('SELECT * FROM people LIMIT 10');
        console.log('   Rows returned:', people.rows ? people.rows.length : 0);
        if (people.rows && people.rows.length > 0) {
            console.log('   First row:', JSON.stringify(people.rows[0], null, 2));
        }
        
        // Try using Knex query builder
        console.log('\n2. Using Knex query builder for People:');
        const peopleKnex = await db('people').limit(10);
        console.log('   Rows returned:', peopleKnex.length);
        if (peopleKnex.length > 0) {
            console.log('   First row:', JSON.stringify(peopleKnex[0], null, 2));
        }
        
        // Check all tables with counts
        console.log('\n3. Row counts for all tables:');
        const tables = ['people', 'roles', 'peopleroles', 'participantdetails', 'admindetails', 
                       'volunteerdetails', 'eventtemplate', 'eventoccurrences', 'eventregistrations', 
                       'surveys', 'milestones', 'donations'];
        
        for (const table of tables) {
            try {
                const result = await db.raw(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result.rows[0].count;
                console.log(`   ${table}: ${count} rows`);
                
                // If there's data, show first row
                if (parseInt(count) > 0) {
                    const firstRow = await db(table).first();
                    console.log(`     First row keys: ${Object.keys(firstRow).join(', ')}`);
                }
            } catch (err) {
                console.log(`   ${table}: ERROR - ${err.message}`);
            }
        }
        
        // Check if there are any rows in any table
        console.log('\n4. Checking for ANY data in database:');
        let totalRows = 0;
        for (const table of tables) {
            try {
                const result = await db.raw(`SELECT COUNT(*) as count FROM ${table}`);
                totalRows += parseInt(result.rows[0].count);
            } catch (err) {
                // Ignore errors
            }
        }
        console.log(`   Total rows across all tables: ${totalRows}`);
        
        await db.destroy();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

queryDirect();



