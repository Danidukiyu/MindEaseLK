const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function waitForTable(tableName, retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
        [tableName]
      );
      if (res.rows[0].exists) return true;
    } catch (e) {
      // Ignore errors during wait
    }
    console.log(`⏳ Waiting for table "${tableName}" to be initialized... (${i + 1}/${retries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
}

async function setupTestAccount() {
  const email = 'test@test.test';
  const password = 'test';
  const username = 'test';

  try {
    console.log('--- Setting up Test Account ---');

    // Wait for the 'users' table to exist
    const tableExists = await waitForTable('users');
    if (!tableExists) {
      console.error('❌ Error: Table "users" was not found after multiple retries.');
      return;
    }

    // 1. Check if user exists
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;

    if (userRes.rows.length === 0) {
      console.log('Creating test user...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertRes = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
        [username, email, hashedPassword]
      );
      userId = insertRes.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
      console.log(`Test user already exists (ID: ${userId}). Cleaning up old test data...`);
      // Cleanup existing data to start fresh
      await pool.query('DELETE FROM mood_submissions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM diary_entries WHERE user_id = $1', [userId]);
      const sessionRes = await pool.query('SELECT id FROM chat_sessions WHERE user_id = $1', [userId]);
      const sessionIds = sessionRes.rows.map(s => s.id);
      if (sessionIds.length > 0) {
        await pool.query('DELETE FROM bot_messages WHERE session_id = ANY($1)', [sessionIds]);
        await pool.query('DELETE FROM chat_sessions WHERE user_id = $1', [userId]);
      }
    }

    console.log('Generating 20 days of mock data...');

    // 2. Generate 20 days of mood data and diary entries
    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Random mood value (0 to 3)
      const moodValue = (Math.random() * 3).toFixed(2);
      await pool.query(
        'INSERT INTO mood_submissions (user_id, mood_value, submission_date, created_at) VALUES ($1, $2, $3, $4)',
        [userId, moodValue, dateStr, date]
      );

      // Diary entry for some days
      if (i % 2 === 0) {
        const content = `Mock diary entry for ${dateStr}. This is a test entry showing the history of user reflections and mental state tracking over time.`;
        await pool.query(
          'INSERT INTO diary_entries (user_id, content, entry_date, created_at) VALUES ($1, $2, $3, $4)',
          [userId, content, dateStr, date]
        );
      }
    }

    // 3. Generate some chat history
    console.log('Generating chat history...');
    const chatTitle = 'MindEase Support Session';
    const sessionRes = await pool.query(
      'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
      [userId, chatTitle]
    );
    const sessionId = sessionRes.rows[0].id;

    const messages = [
      ['Hello, I have been feeling a bit overwhelmed lately.', 'Hello test! It is completely normal to feel overwhelmed. Can you tell me more about what is causing these feelings?'],
      ['I have a lot of work and I feel like I cannot manage it all.', 'Managing a heavy workload is tough. Have you tried breaking your tasks into smaller, manageable chunks?'],
      ['I will try that. Thank you.', 'You are welcome! Remember to take small breaks and be kind to yourself. 🌱']
    ];

    for (let i = 0; i < messages.length; i++) {
      const date = new Date();
      date.setMinutes(date.getMinutes() - (messages.length - i));
      await pool.query(
        'INSERT INTO bot_messages (session_id, message, response, created_at) VALUES ($1, $2, $3, $4)',
        [sessionId, messages[i][0], messages[i][1], date]
      );
    }

    console.log('✅ Test account setup complete!');
  } catch (err) {
    console.error('❌ Failed to setup test account:', err.message);
  } finally {
    await pool.end();
  }
}

setupTestAccount();