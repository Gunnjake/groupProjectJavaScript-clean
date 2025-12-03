// Check which database we're connected to and verify connection
const db = require('./db');

async function checkConnection() {
    try {
        console.log('Checking database connection details...\n');
        
        // Get current database
        const dbName = await db.raw('SELECT current_database() as db_name');
        console.log('Connected to database:', dbName.rows[0].db_name);
        
        // Get current user
        const user = await db.raw('SELECT current_user as user_name');
        console.log('Connected as user:', user.rows[0].user_name);
        
        // Get current schema
        const schema = await db.raw('SELECT current_schema() as schema_name');
        console.log('Current schema:', schema.rows[0].schema_name);
        
        // Get connection host
        const host = await db.raw('SELECT inet_server_addr() as host, inet_server_port() as port');
        console.log('Server host:', host.rows[0].host || 'N/A');
        console.log('Server port:', host.rows[0].port || 'N/A');
        
        // Check all schemas
        console.log('\nAll schemas in database:');
        const schemas = await db.raw(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY schema_name
        `);
        schemas.rows.forEach(row => {
            console.log(`  - ${row.schema_name}`);
        });
        
        // Check tables in each schema
        console.log('\nTables in each schema:');
        for (const schemaRow of schemas.rows) {
            const schemaName = schemaRow.schema_name;
            const tables = await db.raw(`
                SELECT table_name, 
                       (SELECT COUNT(*) FROM information_schema.columns 
                        WHERE table_schema = ? AND table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE table_schema = ?
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `, [schemaName, schemaName]);
            
            if (tables.rows.length > 0) {
                console.log(`\n  Schema: ${schemaName}`);
                tables.rows.forEach(table => {
                    console.log(`    - ${table.table_name} (${table.column_count} columns)`);
                });
            }
        }
        
        // Check if there's data in public schema using pg_stat_user_tables
        console.log('\n\nChecking for data in public schema:');
        try {
            const testQuery = await db.raw(`
                SELECT 
                    schemaname,
                    relname as tablename,
                    n_live_tup as row_count
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
                ORDER BY relname
            `);
            
            if (testQuery.rows.length > 0) {
                console.log('Row counts from pg_stat_user_tables:');
                testQuery.rows.forEach(row => {
                    console.log(`  ${row.tablename}: ${row.row_count} rows`);
                });
            } else {
                console.log('No statistics available (tables may be new or statistics not updated)');
            }
        } catch (err) {
            console.log('Could not get statistics:', err.message);
        }
        
        // Direct count queries for each table
        console.log('\nDirect COUNT queries for each table:');
        const tables = ['people', 'roles', 'peopleroles', 'participantdetails', 'admindetails', 
                       'volunteerdetails', 'eventtemplate', 'eventoccurrences', 'eventregistrations', 
                       'surveys', 'milestones', 'donations'];
        
        for (const table of tables) {
            try {
                const result = await db.raw(`SELECT COUNT(*)::int as count FROM ${table}`);
                const count = result.rows[0].count;
                if (parseInt(count) > 0) {
                    console.log(`  ✓ ${table}: ${count} rows`);
                    // Show sample data
                    const sample = await db(table).limit(1).first();
                    console.log(`    Sample:`, JSON.stringify(sample, null, 2).substring(0, 200));
                } else {
                    console.log(`  - ${table}: 0 rows`);
                }
            } catch (err) {
                console.log(`  ✗ ${table}: ERROR - ${err.message}`);
            }
        }
        
        await db.destroy();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

checkConnection();

