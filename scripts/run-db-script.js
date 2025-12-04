// Script to run the final database script during deployment
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '..', 'final-database-script.sql');

if (!fs.existsSync(sqlFile)) {
    console.log('Database script not found, skipping...');
    process.exit(0);
}

console.log('Running database initialization script...');

const command = `psql -h ${process.env.RDS_HOSTNAME} -U ${process.env.RDS_USERNAME} -d ${process.env.RDS_DB_NAME} -f ${sqlFile}`;

exec(command, { env: { ...process.env, PGPASSWORD: process.env.RDS_PASSWORD } }, (error, stdout, stderr) => {
    if (error) {
        console.error('Error running database script:', error.message);
        // Don't fail deployment if script has errors (might be idempotent)
        process.exit(0);
    }
    console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('Database script execution completed.');
});



