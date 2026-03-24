import { Tabs, useRouter, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { MoodProvider } from "../context/MoodContext"; 
import { AuthProvider, useAuth } from "../context/AuthContext";

function CustomHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Don't show header on login/register
  if (pathname === "/" || pathname === "/register") return null;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerUserText}>{user?.username?.toUpperCase() || "USER"}</Text>
      </View>
    </View>
  );
}

function LogoutTabButton(props: any) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <Pressable
      {...props}
      onPress={async () => {
        await logout();
        router.replace("/");
      }}
    />
  );
}

import Toast from 'react-native-toast-message';

function RootLayoutNav() {
  return (
    <AuthProvider>
      <MoodProvider>
        <Tabs
          initialRouteName="home"
          screenOptions={{
            header: () => <CustomHeader />,
            tabBarStyle: styles.tabBar,
            tabBarShowLabel: false,
            tabBarActiveTintColor: "#436468",
            tabBarInactiveTintColor: "#436468",
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              href: null,
              tabBarStyle: { display: "none" },
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="logout"
            options={{
              tabBarButton: (props) => <LogoutTabButton {...props} />,
              tabBarIcon: () => (
                <View style={styles.iconContainer}>
                  <Ionicons name="log-out-outline" size={26} color="#436468" />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="home"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeCircle]}>
                  <Ionicons name="home" size={24} color="#436468" />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="bot"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeCircle]}>
                  <MaterialCommunityIcons name="water" size={28} color="#436468" />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="zendeck"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeCircle]}>
                  <MaterialCommunityIcons name="disc" size={26} color="#436468" />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="diary"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.activeCircle]}>
                  <FontAwesome5 name="book-medical" size={22} color="#436468" />
                </View>
              ),
            }}
          />
          <Tabs.Screen name="moodtracker" options={{ href: null }} />
          <Tabs.Screen name="register" options={{ href: null, tabBarStyle: { display: "none" }, headerShown: false }} />
          <Tabs.Screen name="+not-found" options={{ href: null }} />
          <Tabs.Screen name="app" options={{ href: null }} />
        </Tabs>
      </MoodProvider>
    </AuthProvider>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutNav />
      <Toast />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: Platform.OS === "ios" ? 100 : 60,
    backgroundColor: "#7ca4ab",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 40 : 10,
    borderBottomWidth: 4,
    borderBottomColor: "#4a8d91",
  },
  headerIcon: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerUserText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
  },
  tabBar: {
    backgroundColor: "#7ca4ab",
    borderTopWidth: 4,
    borderTopColor: "#4a8d91",
    height: 70,
    position: "absolute",
    bottom: 0,
    paddingBottom: Platform.OS === "ios" ? 15 : 5,
  },
  iconContainer: { width: 50, height: 50, justifyContent: "center", alignItems: "center" },
  activeCircle: {
    backgroundColor: "#7ca4ab",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#4a8d91",
    top: -12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});
