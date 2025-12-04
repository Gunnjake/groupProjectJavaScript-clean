// Standalone script to verify .env loading
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('Project root:', __dirname);
console.log('.env path:', path.resolve(envPath));
console.log('.env exists:', fs.existsSync(envPath));
console.log('');
console.log('RDS_HOSTNAME:', process.env.RDS_HOSTNAME || 'NOT SET');
console.log('RDS_USERNAME:', process.env.RDS_USERNAME || 'NOT SET');
console.log('RDS_DB_NAME:', process.env.RDS_DB_NAME || 'NOT SET');
console.log('RDS_PASSWORD:', process.env.RDS_PASSWORD ? '***SET***' : 'NOT SET');
console.log('RDS_PORT:', process.env.RDS_PORT || 'NOT SET');



