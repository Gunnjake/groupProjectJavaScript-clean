// Script to check if database tables exist
const db = require('./db');

async function checkTables() {
    try {
        console.log('Checking database tables...\n');
        
        // List all tables in the public schema
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('Tables found in database:');
        if (tables.rows && tables.rows.length > 0) {
            tables.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        } else {
            console.log('  No tables found!');
        }
        
        // Check specific tables from schema
        const expectedTables = [
            'People', 'people',
            'Roles', 'roles',
            'PeopleRoles', 'peopleroles',
            'EventTemplate', 'eventtemplate',
            'EventOccurrences', 'eventoccurrences',
            'EventRegistrations', 'eventregistrations',
            'Surveys', 'surveys',
            'Milestones', 'milestones',
            'Donations', 'donations'
        ];
        
        console.log('\nChecking expected tables (case variations):');
        for (const tableName of expectedTables) {
            try {
                const result = await db.raw(`SELECT 1 FROM "${tableName}" LIMIT 1`);
                console.log(`  ✓ "${tableName}" exists`);
            } catch (e) {
                try {
                    const result = await db.raw(`SELECT 1 FROM ${tableName} LIMIT 1`);
                    console.log(`  ✓ ${tableName} exists (unquoted)`);
                } catch (e2) {
                    console.log(`  ✗ ${tableName} does not exist`);
                }
            }
        }
        
        await db.destroy();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();

