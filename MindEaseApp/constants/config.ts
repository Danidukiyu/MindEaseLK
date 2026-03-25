import { Platform } from "react-native";
import Constants from "expo-constants";

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
const envApiIp = process.env.EXPO_PUBLIC_API_IP;

// Expo provides the dev server host IP in Expo Go/simulator sessions.
const hostFromExpo =
  Constants.expoConfig?.hostUri?.split(":")[0] ||
  (Constants as any).manifest2?.extra?.expoGo?.debuggerHost?.split(":")[0] ||
  (Constants as any).manifest?.debuggerHost?.split(":")[0] ||
  null;

const resolvedHost = envApiIp || hostFromExpo || "localhost";
const useAndroidEmulatorLoopback =
  Platform.OS === "android" && !envApiIp && !hostFromExpo;

export const API_URL = envApiUrl
  ? envApiUrl.replace(/\/$/, "")
  : useAndroidEmulatorLoopback
  ? "http://10.0.2.2:3000"
  : `http://${resolvedHost}:3000`;

console.log("[config] Using API_URL:", API_URL);
