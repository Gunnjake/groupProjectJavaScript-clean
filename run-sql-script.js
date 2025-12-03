// Script to run the SQL creation script
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runSQLScript() {
    try {
        console.log('Reading SQL script...\n');
        const sqlScript = fs.readFileSync(path.join(__dirname, 'FInalTableCreation.sql'), 'utf8');
        
        // Remove comments and split by semicolons
        // Handle multi-line statements properly
        let cleanedScript = sqlScript
            .split('\n')
            .map(line => {
                // Remove inline comments
                const commentIndex = line.indexOf('--');
                if (commentIndex >= 0) {
                    return line.substring(0, commentIndex);
                }
                return line;
            })
            .join('\n');
        
        // Split by semicolons, but keep multi-line statements together
        const statements = cleanedScript
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.length > 10); // Filter out very short fragments
        
        console.log(`Found ${statements.length} SQL statements to execute\n`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.length < 10) continue; // Skip very short statements
            
            try {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                await db.raw(statement);
                console.log(`  ✓ Success\n`);
            } catch (error) {
                // Some errors are expected (like DROP TABLE IF EXISTS when table doesn't exist)
                if (error.message.includes('does not exist')) {
                    console.log(`  ⚠ Skipped (expected): ${error.message.split('\n')[0]}\n`);
                } else {
                    console.error(`  ✗ Error: ${error.message.split('\n')[0]}\n`);
                    throw error;
                }
            }
        }
        
        console.log('✓ SQL script executed successfully!\n');
        
        // Verify tables were created
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('Tables created:');
        tables.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        
        await db.destroy();
    } catch (error) {
        console.error('\n✗ Error running SQL script:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

runSQLScript();

