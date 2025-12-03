// Script to show all database tables and their contents
const db = require('./db');

async function showTables() {
    try {
        console.log('='.repeat(80));
        console.log('DATABASE TABLES AND CONTENTS');
        console.log('='.repeat(80));
        console.log('');

        // Show connection info
        const dbInfo = await db.raw('SELECT current_database() as db, current_user as user, current_schema() as schema');
        console.log(`Database: ${dbInfo.rows[0].db}`);
        console.log(`User: ${dbInfo.rows[0].user}`);
        console.log(`Schema: ${dbInfo.rows[0].schema}`);
        console.log('');

        // Get all tables
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        if (!tables.rows || tables.rows.length === 0) {
            console.log('No tables found in the database.');
            await db.destroy();
            return;
        }

        console.log(`Found ${tables.rows.length} tables:\n`);

        // For each table, show structure and data
        for (const tableRow of tables.rows) {
            const tableName = tableRow.table_name;
            
            console.log('─'.repeat(80));
            console.log(`TABLE: ${tableName.toUpperCase()}`);
            console.log('─'.repeat(80));

            // Get column information
            const columns = await db.raw(`
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND LOWER(table_name) = LOWER(?)
                ORDER BY ordinal_position;
            `, [tableName]);

            console.log('\nColumns:');
            columns.rows.forEach(col => {
                const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`  - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
            });

            // Get row count - use Knex query builder (handles case automatically)
            const rowCount = await db(tableName).count('* as count').first();
            const count = parseInt(rowCount.count);

            console.log(`\nRow count: ${count}`);

            // Show data if table has rows
            if (count > 0) {
                console.log('\nData:');
                // Use Knex query builder (handles case automatically)
                const data = await db(tableName).limit(50);
                
                if (data && data.length > 0) {
                    // Get column names
                    const colNames = Object.keys(data[0]);
                    
                    // Calculate column widths
                    const colWidths = {};
                    colNames.forEach(col => {
                        colWidths[col] = Math.max(
                            col.length,
                            ...data.map(row => {
                                const val = row[col];
                                return val ? String(val).length : 4;
                            })
                        );
                        colWidths[col] = Math.min(colWidths[col], 30); // Max width 30
                    });

                    // Print header
                    const header = colNames.map(col => col.padEnd(colWidths[col])).join(' | ');
                    console.log('  ' + header);
                    console.log('  ' + '-'.repeat(header.length));

                    // Print rows
                    data.forEach((row, idx) => {
                        const rowStr = colNames.map(col => {
                            const val = row[col];
                            const displayVal = val === null ? 'NULL' : String(val);
                            return displayVal.substring(0, 30).padEnd(colWidths[col]);
                        }).join(' | ');
                        console.log('  ' + rowStr);
                        
                        if (idx >= 49) {
                            console.log(`  ... (showing first 50 rows, total: ${count})`);
                            return;
                        }
                    });
                }
            } else {
                console.log('  (No data)');
            }

            console.log('');
        }

        console.log('='.repeat(80));
        console.log('END OF DATABASE CONTENTS');
        console.log('='.repeat(80));
        console.log('\nNote: If you see data in another tool but not here,');
        console.log('you may be connected to a different database instance.');

        await db.destroy();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

showTables();
