// Knex config - DB connection settings for dev and production
// AWS RDS environment variables are automatically provided by Elastic Beanstalk

require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      // Use RDS variables if available (for AWS), otherwise fall back to custom DB_ vars or localhost
      host: process.env.RDS_HOSTNAME || process.env.DB_HOST || 'localhost',
      port: process.env.RDS_PORT || process.env.DB_PORT || 5432,
      database: process.env.RDS_DB_NAME || process.env.DB_NAME || 'ellarises',
      user: process.env.RDS_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD || '',
      // Enable SSL if RDS variables are present (AWS RDS requires SSL)
      ssl: (process.env.RDS_HOSTNAME) ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      // AWS RDS variables take priority, fall back to custom DB_ variables
      host: process.env.RDS_HOSTNAME || process.env.DB_HOST,
      port: process.env.RDS_PORT || process.env.DB_PORT || 5432,
      database: process.env.RDS_DB_NAME || process.env.DB_NAME,
      user: process.env.RDS_USERNAME || process.env.DB_USER,
      password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
      // AWS RDS requires SSL - enable it if RDS_HOSTNAME is present or DB_SSL is true
      ssl: (process.env.RDS_HOSTNAME || process.env.DB_SSL === 'true') 
        ? { rejectUnauthorized: false } 
        : false
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};


