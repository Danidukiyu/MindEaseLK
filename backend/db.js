const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const initDb = async (retries = 5, delay = 3000) => {
  let client;
  while (retries > 0) {
    try {
      client = await pool.connect();
      console.log("Connected to the database!");
      break;
    } catch (err) {
      retries -= 1;
      console.log(`❌ Database connection failed. Retrying... (${retries} retries left)`);
      if (retries === 0) {
        console.error("❌ Max retries reached. Could not connect to the database.");
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure existing tables are updated if they were created before
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
          ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
        END IF;
        
        -- Remove unique constraint from username if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='users_username_key') THEN
          ALTER TABLE users DROP CONSTRAINT users_username_key;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS mood_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        mood_value NUMERIC NOT NULL,
        submission_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration for mood_value to NUMERIC if it's already INTEGER
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mood_submissions' AND column_name='mood_value' AND data_type='integer') THEN
          ALTER TABLE mood_submissions ALTER COLUMN mood_value TYPE NUMERIC;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS diary_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        entry_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Check if bot_messages needs migration
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_messages') THEN
          CREATE TABLE bot_messages (
            id SERIAL PRIMARY KEY,
            session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_messages' AND column_name='session_id') THEN
          -- Add session_id column if it doesn't exist
          ALTER TABLE bot_messages ADD COLUMN session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE;
          
          -- Optional: migrate existing messages to a default session if user_id exists
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_messages' AND column_name='user_id') THEN
            -- We don't drop user_id yet to be safe, but let's make it nullable
            ALTER TABLE bot_messages ALTER COLUMN user_id DROP NOT NULL;
          END IF;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS music_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        genres TEXT[] NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database initialized successfully!");
  } catch (err) {
    console.error("❌ Error initializing database tables:", err);
  } finally {
    if (client) client.release();
  }
};

module.exports = { pool, initDb };