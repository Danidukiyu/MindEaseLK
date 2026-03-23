const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting MindEase Automatic Setup...');

function run(cmd, dir, exitOnError = true) {
  console.log(`\n📦 Running [${cmd}] in ${dir || 'root'}...`);
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit' });
    return true;
  } catch (err) {
    if (exitOnError) {
      console.error(`❌ Command failed: ${cmd}`);
      process.exit(1);
    }
    return false;
  }
}

function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function containersExist() {
  try {
    const output = execSync('docker-compose ps -q', { encoding: 'utf8' }).trim();
    return output.length > 0;
  } catch (e) {
    return false;
  }
}

// 1. Install root dependencies
run('npm install');

// 2. Install Backend dependencies
run('npm install', 'backend');

// 3. Install App dependencies
run('npm install', 'MindEaseApp');

// 4. Update Frontend IP
run('node scripts/update-ip.js', 'MindEaseApp');

// 5. Start Docker Environment (Database + Backend)
console.log('\n🐳 Setting up Docker Environment...');

if (!isDockerRunning()) {
  console.error('❌ Docker is not running. Please start Docker Desktop and try again.');
  process.exit(1);
}

console.log('🔄 Ensuring Docker containers are running...');
// 'up -d --build' ensures the latest code is always built and deployed.
run('docker-compose up -d --build');

async function waitForBackend(retries = 10, delay = 2000) {
  const url = 'http://localhost:3000/auth/login'; // Test endpoint
  console.log('⏳ Waiting for backend to be ready...');
  
  for (let i = 0; i < retries; i++) {
    try {
      // Use a simple fetch-like check with execSync
      execSync(`curl -s -X POST -H "Content-Type: application/json" -d "{}" ${url}`, { stdio: 'ignore' });
      console.log('✅ Backend is ready!');
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return false;
}

// Since setup.js isn't async, we'll use a simple sleep loop if needed or just inform the user.
console.log('✅ Docker Environment triggered!');
console.log('ℹ️ It may take a few seconds for the database to initialize.');

// 6. Check if Backend .env exists
const backendEnv = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnv)) {
    console.log('\n⚠️ Backend .env not found. Please create it using backend/.env.example if available.');
}

console.log('\n✅ Setup Complete!');
console.log('\n💡 To start the database, run: docker-compose up -d');
console.log('💡 To start the backend, run: cd backend && npm start');
console.log('💡 To start the app, run: cd MindEaseApp && npx expo start');
