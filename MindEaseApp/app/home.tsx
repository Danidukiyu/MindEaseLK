import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  PressStart2P_400Regular,
} from "@expo-google-fonts/press-start-2p";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useMood } from "../context/MoodContext";
import { API_URL } from "../constants/config";
import { LineChart } from "react-native-chart-kit";
import Toast from 'react-native-toast-message';

const { width: screenWidth } = Dimensions.get("window");

type MoodType = {
  label: string;
  color: string;
  description: string;
  emoji: string;
};

const MOODS: MoodType[] = [
  { label: "SAD", color: "#ef4444", description: "Rough day...", emoji: "😢" },
  { label: "OKAY", color: "#94a3b8", description: "Just hanging in.", emoji: "😐" },
  { label: "GOOD", color: "#fde047", description: "Life is good.", emoji: "🙂" },
  { label: "GREAT", color: "#4ade80", description: "Feeling amazing!", emoji: "😄" },
];

const TRACK_WIDTH = screenWidth * 0.65;
const HANDLE_SIZE = 40;

export default function PixelMoodApp() {
  const [moodIndex, setMoodIndex] = useState(1); // Default to Middle
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [fontsLoaded] = useFonts({ PressStart2P: PressStart2P_400Regular });
  const { token } = useAuth();
  const { history, fetchMoods } = useMood();

  const panValue = useRef(new Animated.Value(TRACK_WIDTH / 2)).current;
  const startX = useRef(0);

  useEffect(() => {
    checkTodaySubmission();
    
    const listenerId = panValue.addListener(({ value }) => {
      const idx = Math.min(MOODS.length - 1, Math.max(0, Math.round((value / TRACK_WIDTH) * (MOODS.length - 1))));
      if (!isNaN(idx)) {
        setMoodIndex(idx);
      }
    });

    return () => panValue.removeListener(listenerId);
  }, [token]);

  const checkTodaySubmission = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/moods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const today = new Date().toLocaleDateString('en-CA');
      const submittedToday = response.data.some((m: any) => 
        new Date(m.submission_date).toLocaleDateString('en-CA') === today
      );
      setHasSubmittedToday(submittedToday);
    } catch (error) {
      console.error("Check submission error:", error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setScrollEnabled(false);
        startX.current = (panValue as any)._value;
      },
      onPanResponderMove: (_, gestureState) => {
        let newVal = startX.current + gestureState.dx;
        if (newVal < 0) newVal = 0;
        if (newVal > TRACK_WIDTH) newVal = TRACK_WIDTH;
        panValue.setValue(newVal);
      },
      onPanResponderRelease: () => {
        setScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
      },
    })
  ).current;

  const handleSubmit = async () => {
    if (hasSubmittedToday) {
        Toast.show({
          type: 'info',
          text1: 'Already Submitted',
          text2: 'You have already done the submission for today.',
        });
        return;
    }

    // Allow decimal mood values based on exact slider position
    const rawValue = (panValue as any)._value;
    const moodValue = Number(((rawValue / TRACK_WIDTH) * (MOODS.length - 1)).toFixed(2));
    
    try {
      await axios.post(`${API_URL}/moods`, 
        { moodValue }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({
        type: 'success',
        text1: 'Mood Submitted!',
        text2: 'Keep breathing, you are doing great! 🌱',
      });
      setHasSubmittedToday(true);
      fetchMoods();
    } catch (error: any) {
      const msg = error.response?.data?.error || "Failed to submit mood";
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: msg,
      });
      if (msg.includes("already")) setHasSubmittedToday(true);
    }
  };

  if (!fontsLoaded) return null;

  const dynamicColor = panValue.interpolate({
    inputRange: [0, TRACK_WIDTH / 3, (TRACK_WIDTH / 3) * 2, TRACK_WIDTH],
    outputRange: MOODS.map(m => m.color),
  });

  // Graph Logic: Last 10 days
  const displayHistory = history.slice(-10);
  
  const chartData = {
    labels: displayHistory.length > 0 ? displayHistory.map(h => h.day) : ["N/A"],
    datasets: [
      {
        data: displayHistory.length > 0 
          ? displayHistory.map(h => h.value > 3 ? 3 : h.value) 
          : [0, 3], 
        color: (opacity = 1) => `rgba(67, 100, 104, ${opacity})`,
        strokeWidth: 4
      },
      // Invisible dataset to force range 0-3
      {
        data: [0, 3],
        color: () => "transparent",
        strokeWidth: 0,
        withDots: false,
      }
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fdf5e2",
    backgroundGradientTo: "#fdf5e2",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(67, 100, 104, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(67, 100, 104, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" },
  };

  const currentMood = MOODS[moodIndex] || MOODS[0];

  return (
    <ImageBackground
      source={{ uri: "https://images.alphacoders.com/113/thumb-1920-1130469.png" }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          <View style={styles.headerContainer}>
            <View style={styles.welcomePill}>
              <Text style={styles.welcomeText}>MINDEASE</Text>
            </View>
          </View>

          <View style={styles.glassCard}>
            {hasSubmittedToday ? (
                <View style={styles.alreadySubmittedContainer}>
                    <Ionicons name="checkmark-circle" size={60} color="#4ade80" />
                    <Text style={styles.alreadySubmittedText}>You have already done the submission</Text>
                    <Text style={styles.alreadySubmittedSub}>See you tomorrow! 🌱</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.questionText}>How are you feeling today?</Text>

                    <View style={styles.sliderSection}>
                        <View style={styles.iconRow}>
                            {MOODS.map((m, i) => (
                                <View key={i} style={styles.iconWrapper}>
                                    <Text style={[
                                        styles.emojiText,
                                        { opacity: moodIndex === i ? 1 : 0.3 }
                                    ]}>
                                        {m.emoji}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.trackWrapper}>
                            <View style={styles.trackBase}>
                                <Animated.View style={[styles.trackFill, { width: panValue, backgroundColor: dynamicColor }]} />
                                <Animated.View
                                    style={[styles.handle, { left: panValue, backgroundColor: dynamicColor }]}
                                    {...panResponder.panHandlers}
                                >
                                    <View style={styles.handleInner}>
                                        <Text style={styles.handleEmoji}>{currentMood.emoji}</Text>
                                    </View>
                                </Animated.View>
                            </View>
                        </View>

                        <View style={styles.labelRow}>
                            {MOODS.map((m, i) => (
                                <Text key={i} style={[styles.moodLabel, moodIndex === i && { color: m.color, opacity: 1 }]}>
                                    {m.label}
                                </Text>
                            ))}
                        </View>
                    </View>

                    <Animated.View style={[styles.statusBox, { borderColor: dynamicColor }]}>
                        <Text style={styles.statusTitle}>{currentMood.label}</Text>
                        <Text style={styles.statusDesc}>{currentMood.description}</Text>
                    </Animated.View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                        <Text style={styles.submitBtnText}>SUBMIT MOOD</Text>
                    </TouchableOpacity>
                </>
            )}
          </View>

          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
                <Text style={styles.chartHeaderTitle}>MOOD HISTORY</Text>
            </View>
            <View style={styles.chartContainer}>
                {history.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <LineChart
                            data={chartData}
                            width={Math.max(screenWidth * 0.85, displayHistory.length * 70)}
                            height={240}
                            chartConfig={chartConfig}
                            fromZero
                            segments={3}
                            style={styles.chart}
                            yAxisLabel=""
                            yAxisSuffix=""
                            formatYLabel={(yValue) => {
                                const val = Math.round(parseFloat(yValue));
                                if (val === 0) return MOODS[0].emoji;
                                if (val === 1) return MOODS[1].emoji;
                                if (val === 2) return MOODS[2].emoji;
                                if (val === 3) return MOODS[3].emoji;
                                return "";
                            }}
                            withInnerLines={false}
                            withOuterLines={true}
                            withVerticalLines={true}
                            withHorizontalLines={true}
                        />
                    </ScrollView>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No data yet🌱</Text>
                    </View>
                )}
            </View>
          </View>
          <View style={{ height: 120 }} /> 
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { alignItems: "center", paddingTop: 20 },
  headerContainer: { width: "85%", marginBottom: 20 },
  welcomePill: {
    backgroundColor: "rgba(6, 78, 59, 0.85)",
    borderRadius: 15,
    padding: 12,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#022c22",
  },
  welcomeText: {
    fontFamily: "PressStart2P",
    fontSize: 16,
    color: "#ffffff",
    letterSpacing: 2,
  },
  glassCard: {
    width: "92%",
    backgroundColor: "rgba(253, 245, 226, 0.85)",
    borderRadius: 30,
    borderWidth: 4,
    borderColor: "#4a8d91",
    paddingVertical: 30,
    paddingHorizontal: 15,
    alignItems: "center",
    marginBottom: 25,
    minHeight: 380,
    justifyContent: 'center',
  },
  alreadySubmittedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  alreadySubmittedText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
  alreadySubmittedSub: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#64748b",
    marginTop: 15,
  },
  questionText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
    textAlign: "center",
    marginBottom: 30,
  },
  sliderSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  iconRow: {
    flexDirection: "row",
    width: TRACK_WIDTH + 30,
    justifyContent: "space-between",
    marginBottom: 15,
  },
  iconWrapper: {
    width: 30,
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  trackWrapper: {
    width: TRACK_WIDTH,
    height: 40,
    justifyContent: "center",
    marginHorizontal: 20,
  },
  trackBase: {
    width: "100%",
    height: 12,
    backgroundColor: "rgba(67, 100, 104, 0.15)",
    borderRadius: 6,
    position: "relative",
  },
  trackFill: {
    height: "100%",
    borderRadius: 6,
  },
  handle: {
    position: "absolute",
    top: -(HANDLE_SIZE/2 - 6),
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginLeft: -HANDLE_SIZE/2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleEmoji: {
    fontSize: 20,
  },
  labelRow: {
    flexDirection: "row",
    width: TRACK_WIDTH + 60,
    justifyContent: "space-between",
    marginTop: 10,
  },
  moodLabel: {
    fontFamily: "PressStart2P",
    fontSize: 7,
    color: "#436468",
    opacity: 0.4,
    textAlign: 'center',
    width: 60,
  },
  statusBox: {
    marginTop: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 15,
    borderRadius: 15,
    width: "90%",
    borderWidth: 3,
    alignItems: "center",
  },
  statusTitle: { fontFamily: "PressStart2P", fontSize: 12, color: "#436468", marginBottom: 5 },
  statusDesc: { fontFamily: "PressStart2P", fontSize: 7, color: "#64748b" },
  submitBtn: {
    marginTop: 25,
    backgroundColor: "#436468",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderBottomWidth: 4,
    borderBottomColor: "#2c4245",
  },
  submitBtnText: {
    fontFamily: "PressStart2P",
    color: "#fff",
    fontSize: 10,
  },
  chartSection: {
    width: "92%",
    alignItems: "center",
    marginBottom: 20,
  },
  chartHeader: {
    backgroundColor: "rgba(6, 78, 59, 0.85)",
    borderRadius: 15,
    padding: 10,
    width: "100%",
    marginBottom: 15,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#022c22",
  },
  chartHeaderTitle: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    color: "#ffffff",
  },
  chartContainer: {
    backgroundColor: "rgba(253, 245, 226, 0.85)",
    borderRadius: 20,
    padding: 10,
    borderWidth: 4,
    borderColor: "#4a8d91",
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 40,
  },
  emptyState: {
    height: 150,
    width: screenWidth * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
  },
});