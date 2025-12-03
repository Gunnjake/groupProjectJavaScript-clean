// Script to verify database connection and show current database info
const db = require('./db');

async function verifyConnection() {
    try {
        console.log('Verifying database connection...\n');
        
        // Get current database name
        const dbName = await db.raw('SELECT current_database() as db_name');
        console.log('Connected to database:', dbName.rows[0].db_name);
        
        // Get current schema
        const schema = await db.raw('SELECT current_schema() as schema_name');
        console.log('Current schema:', schema.rows[0].schema_name);
        
        // Get current user
        const user = await db.raw('SELECT current_user as user_name');
        console.log('Current user:', user.rows[0].user_name);
        
        // Count tables
        const tableCount = await db.raw(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in public schema:', tableCount.rows[0].count);
        
        // List all schemas
        const schemas = await db.raw(`
            SELECT schema_name 
            FROM information_schema.schemata 
            ORDER BY schema_name
        `);
        console.log('\nAvailable schemas:');
        schemas.rows.forEach(row => {
            console.log(`  - ${row.schema_name}`);
        });
        
        await db.destroy();
        console.log('\n✓ Connection verified successfully');
    } catch (error) {
        console.error('✗ Connection error:', error.message);
        process.exit(1);
    }
}

verifyConnection();

