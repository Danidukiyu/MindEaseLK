import { Platform } from "react-native";

/**
 * The API IP is loaded from the .env file (EXPO_PUBLIC_API_IP).
 * Run 'node scripts/update-ip.js' to automatically detect your PC's IP.
 */
const YOUR_COMPUTER_IP = process.env.EXPO_PUBLIC_API_IP || "localhost"; 

export const API_URL = Platform.select({
  // Android Emulator uses 10.0.2.2 to access host's localhost
  android: YOUR_COMPUTER_IP === "localhost" ? "http://10.0.2.2:3000" : `http://${YOUR_COMPUTER_IP}:3000`,
  
  // iOS Simulator and Web can use localhost
  ios: YOUR_COMPUTER_IP === "localhost" ? "http://localhost:3000" : `http://${YOUR_COMPUTER_IP}:3000`,
  default: `http://${YOUR_COMPUTER_IP}:3000`,
});

console.log("Using API_URL:", API_URL);
