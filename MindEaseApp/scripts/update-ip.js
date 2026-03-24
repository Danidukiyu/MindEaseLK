const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const envPath = path.join(__dirname, '..', '.env');
const localIP = getLocalIP();
const envContent = `EXPO_PUBLIC_API_IP=${localIP}\n`;

try {
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Frontend .env updated with Local IP: ${localIP}`);
} catch (err) {
  console.error('❌ Failed to update .env:', err.message);
  process.exit(1);
}
