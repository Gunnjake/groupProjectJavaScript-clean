// Knex config - DB connection settings using AWS RDS variables (PostgreSQL)

// Load .env ONLY in development (production uses Elastic Beanstalk environment variables)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.RDS_HOSTNAME ,
      port: parseInt(process.env.RDS_PORT) || 5432,
      database: process.env.RDS_DB_NAME,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    // PostgreSQL converts unquoted identifiers to lowercase
    // Since tables were created without quotes, use lowercase names
    wrapIdentifier: (value, origImpl) => origImpl(value.toLowerCase())
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.RDS_HOSTNAME,
      port: parseInt(process.env.RDS_PORT) || 5432,
      database: process.env.RDS_DB_NAME,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    // PostgreSQL converts unquoted identifiers to lowercase
    wrapIdentifier: (value, origImpl) => origImpl(value.toLowerCase())
  }
};


