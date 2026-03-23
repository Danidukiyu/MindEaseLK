const { pool } = require('./db');
pool.query("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users'")
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
