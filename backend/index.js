const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDb } = require('./db');
require('dotenv').config();

const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAtps-FRpdtdNpjfEMU5n-Bo8_YpinRNd4";

if (!GEMINI_API_KEY) {
  console.error("WARNING: No GEMINI_API_KEY found in .env!");
}

// Helper: Call AI using Axios for better stability in Node environment
async function callAI(message) {
  const model = "gemini-flash-lite-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: message }] }]
    });
    
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }
    throw new Error("Invalid response format from AI service.");
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const errorMsg = err.response.data?.error?.message || "AI service returned an error.";
      console.error(`[AI Service Error] Status ${status}: ${errorMsg}`);
      const error = new Error(errorMsg);
      error.status = status;
      throw error;
    }
    console.error("[AI Service Error] Network or Unknown Error:", err.message);
    throw err;
  }
}

// Middleware: Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required.' });

  try {
    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      token, 
      id: user.id, 
      username: user.username, 
      email: user.email 
    });
  } catch (err) {
    console.error("Reg Error:", err.message);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, id: user.id, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bot Routes ---
app.get('/bot/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/bot/sessions', authenticateToken, async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
      [req.user.id, title || 'New Chat']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// To track active AI requests and prevent concurrency issues per user
const pendingRequests = new Set();

app.post('/bot/chat', authenticateToken, async (req, res) => {
  const { message, session_id } = req.body;
  let currentSessionId = session_id;
  const userId = req.user.id;

  console.log(`[Chat] Request from user ${userId}, session: ${session_id}, message length: ${message?.length}`);

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Message is required and must be a string." });
  }

  if (pendingRequests.has(userId)) {
    return res.status(429).json({ error: "Still processing your previous message. Please wait." });
  }

  pendingRequests.add(userId);

  try {
    // If no session_id provided, create a new session
    if (!currentSessionId) {
      console.log(`[Chat] Creating new session for user ${userId}`);
      const sessionResult = await pool.query(
        'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
        [userId, message.substring(0, 30) || 'New Chat']
      );
      currentSessionId = sessionResult.rows[0].id;
    }

    console.log(`[Chat] Using session ${currentSessionId}, calling AI...`);
    const aiResponse = await callAI(message);

    console.log(`[Chat] AI responded, saving to database...`);
    await pool.query(
      'INSERT INTO bot_messages (session_id, message, response) VALUES ($1, $2, $3)',
      [currentSessionId, message, aiResponse]
    );
    console.log(`[Chat] Success!`);
    res.json({ response: aiResponse, session_id: currentSessionId });
  } catch (err) {
    console.error("[Chat] Error:", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "AI Rate limit reached. Please try again in a few seconds." });
    }
    // Check for database constraint errors
    if (err.code === '23503') {
       return res.status(400).json({ error: "Invalid session or user. Please try starting a new chat." });
    }
    res.status(err.status || 500).json({ error: "Failed to get response from AI: " + err.message });
  } finally {
    pendingRequests.delete(userId);
  }
});

app.get('/bot/history', authenticateToken, async (req, res) => {
  const { session_id } = req.query;
  try {
    let result;
    if (session_id) {
      result = await pool.query(
        'SELECT * FROM bot_messages WHERE session_id = $1 ORDER BY created_at ASC',
        [session_id]
      );
    } else {
      // Fallback or default behavior if no session_id is provided
      result = await pool.query(
        'SELECT m.* FROM bot_messages m JOIN chat_sessions s ON m.session_id = s.id WHERE s.user_id = $1 ORDER BY m.created_at ASC',
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Other Routes (Mood, Diary, Music) ---
app.post('/moods', authenticateToken, async (req, res) => {
  const { moodValue } = req.body;
  try {
    // Check if user has already submitted a mood today
    const checkResult = await pool.query(
      'SELECT id FROM mood_submissions WHERE user_id = $1 AND submission_date = CURRENT_DATE',
      [req.user.id]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted your mood today.' });
    }

    await pool.query(
      'INSERT INTO mood_submissions (user_id, mood_value) VALUES ($1, $2)',
      [req.user.id, moodValue]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/moods', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT mood_value, submission_date FROM mood_submissions WHERE user_id = $1 ORDER BY submission_date ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/diary', authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required.' });

  try {
    // Check if user has already submitted a diary entry today
    const checkResult = await pool.query(
      'SELECT id FROM diary_entries WHERE user_id = $1 AND entry_date = CURRENT_DATE',
      [req.user.id]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already written a diary entry today. Please edit your existing entry instead.' });
    }

    await pool.query('INSERT INTO diary_entries (user_id, content) VALUES ($1, $2)', [req.user.id, content]);
    res.sendStatus(201);
  } catch (err) { 
    console.error("Diary Post Error:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/diary', authenticateToken, async (req, res) => {
  try {
    // Limit to 10 most recent entries
    const result = await pool.query('SELECT * FROM diary_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/diary/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required.' });

  try {
    const result = await pool.query(
      'UPDATE diary_entries SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [content, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diary entry not found or unauthorized.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/music/recommendations', authenticateToken, async (req, res) => {
  try {
    const prefResult = await pool.query('SELECT genres FROM music_preferences WHERE user_id = $1', [req.user.id]);
    const genres = prefResult.rows[0]?.genres || [];
    const recommendations = genres.map(genre => ({ title: `${genre} Healing Session`, genre, url: `https://www.youtube.com/results?search_query=${genre}+meditation` }));
    res.json(recommendations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/music/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT genres FROM music_preferences WHERE user_id = $1', [req.user.id]);
    res.json(result.rows[0] || { genres: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/music/preferences', authenticateToken, async (req, res) => {
  const { genres } = req.body;
  try {
    await pool.query(
      'INSERT INTO music_preferences (user_id, genres) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET genres = $2, updated_at = CURRENT_TIMESTAMP',
      [req.user.id, genres]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize DB and Start Server
const startServer = async () => {
  try {
    await initDb();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
  } catch (err) {
    console.error("❌ Failed to initialize database. Exiting...", err);
    process.exit(1);
  }
};

startServer();

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});
