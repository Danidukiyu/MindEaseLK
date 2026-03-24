import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Alert,
} from "react-native";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../constants/config";

import {
  useFonts,
  PressStart2P_400Regular,
} from "@expo-google-fonts/press-start-2p";

import Toast from 'react-native-toast-message';

// Update this with your actual local IP address for physical device testing

const LoginScreen: React.FC = () => {
  const router = useRouter(); 
  const { login } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const [fontsLoaded] = useFonts({
    PressStart2P: PressStart2P_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all fields',
      });
      return;
    }

    try {
      console.log("Attempting login at:", `${API_URL}/auth/login`);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, id, username, email: userEmail } = response.data;
      
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome back, ${username}!`,
      });

      await login({ id, username, email: userEmail }, token, rememberMe);
      router.replace("/home");
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMsg = "Something went wrong";
      if (error.code === "ERR_NETWORK") {
        errorMsg = "Cannot reach server. Check your connection or IP.";
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }

      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMsg,
      });
    }
  };

  return (
    <ImageBackground
      source={{
        uri: "https://images.alphacoders.com/113/thumb-1920-1130469.png",
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🌱 MIND EASE</Text>
              <Text style={styles.subtitle}>Your Safe Space to Breathe</Text>
            </View>

            <View style={styles.clipboardContainer}>
              <View style={styles.clipContainer}>
                <View style={styles.clip} />
              </View>

              <View style={styles.authCard}>
                <Text style={styles.titleKarmatic}>LOGIN</Text>

                <View style={styles.separatorContainer}>
                  <Text style={styles.diamond}>◆</Text>
                  <View style={styles.titleSeparator} />
                  <Text style={styles.diamond}>◆</Text>
                </View>

                <Text style={styles.welcomeText}>Welcome back 🌱</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.pixelInput}
                    placeholder="your@email.com"
                    placeholderTextColor="#b0b8b5"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.pixelInput}
                    placeholder="••••••••"
                    secureTextEntry
                    placeholderTextColor="#b0b8b5"
                    value={password}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        rememberMe && styles.checkboxChecked,
                      ]}
                    >
                      {rememberMe && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={styles.checkboxLabel}>Remember Me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnJourney}
                    onPress={handleLogin}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnText}>Start Journey</Text>
                  </TouchableOpacity>
                </View>

                {/* ADDED NAVIGATION TO REGISTER */}
                <TouchableOpacity
                  onPress={() => router.push("/register")}
                  style={styles.footer}
                >
                  <Text style={styles.footerText}>
                    New here? <Text style={styles.linkText}>Create Account</Text>
                  </Text>
                </TouchableOpacity>

              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

interface Styles {
  background: ImageStyle;
  container: ViewStyle;
  flex: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  subtitle: TextStyle;
  clipboardContainer: ViewStyle;
  clipContainer: ViewStyle;
  clip: ViewStyle;
  authCard: ViewStyle;
  titleKarmatic: TextStyle;
  separatorContainer: ViewStyle;
  titleSeparator: ViewStyle;
  diamond: TextStyle;
  welcomeText: TextStyle;
  inputGroup: ViewStyle;
  inputLabel: TextStyle;
  pixelInput: TextStyle;
  checkboxContainer: ViewStyle;
  checkbox: ViewStyle;
  checkboxChecked: ViewStyle;
  checkboxInner: ViewStyle;
  checkboxLabel: TextStyle;
  btnJourney: ViewStyle;
  btnText: TextStyle;
  footer: ViewStyle;
  footerText: TextStyle;
  linkText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: "PressStart2P",
    fontSize: 18,
    color: "#ffffff",
    textShadowColor: "#5f9298",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  subtitle: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#edf2f0",
    marginTop: 8,
  },
  clipboardContainer: {
    width: 340,
    position: "relative",
  },
  clipContainer: {
    alignItems: "center",
    zIndex: 2,
    marginBottom: -15,
  },
  clip: {
    width: 60,
    height: 30,
    backgroundColor: "#cbd5d0",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 4,
    borderColor: "#4a8d91",
  },
  authCard: {
    backgroundColor: "#fdf5e2",
    borderWidth: 6,
    borderColor: "#4a8d91",
    borderRadius: 40,
    padding: 30,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  titleKarmatic: {
    fontFamily: "PressStart2P",
    fontSize: 20,
    color: "#436468",
    textAlign: "center",
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  titleSeparator: {
    flex: 1,
    height: 2,
    backgroundColor: "#cbd5d0",
    marginHorizontal: 8,
  },
  diamond: {
    color: "#cbd5d0",
    fontSize: 10,
  },
  welcomeText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    textAlign: "center",
    color: "#436468",
    marginBottom: 20,
  },
  inputGroup: {
    width: "100%",
  },
  inputLabel: {
    fontFamily: "PressStart2P",
    fontSize: 9,
    color: "#436468",
    marginBottom: 8,
    marginTop: 15,
  },
  pixelInput: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 4,
    borderColor: "#cbd5d0",
    borderRadius: 20,
    padding: 12,
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: "#4a8d91",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  checkboxChecked: {
    backgroundColor: "#fff",
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: "#4a8d91",
  },
  checkboxLabel: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
  },
  btnJourney: {
    backgroundColor: "#60a5a1",
    borderBottomWidth: 6,
    borderBottomColor: "#3e6d6a",
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    fontFamily: "PressStart2P",
    color: "#fff",
    fontSize: 12,
  },
  footer: {
    marginTop: 25,
    alignItems: "center",
  },
  footerText: {
    fontFamily: "PressStart2P",
    fontSize: 7,
    color: "#436468",
  },
  linkText: {
    color: "#4a8d91",
  },
});

export default LoginScreen;