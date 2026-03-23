const { pool } = require('./db');
async function check() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bot_messages'");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
