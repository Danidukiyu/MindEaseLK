import React, { useEffect } from "react";
import { StyleSheet, View, Text, Dimensions, ImageBackground, SafeAreaView } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useMood } from "../context/MoodContext";
import {
  useFonts,
  PressStart2P_400Regular,
} from "@expo-google-fonts/press-start-2p";

const screenWidth = Dimensions.get("window").width;

export default function MoodTrackerScreen() {
  const { history, fetchMoods } = useMood();
  const [fontsLoaded] = useFonts({ PressStart2P: PressStart2P_400Regular });

  useEffect(() => {
    fetchMoods();
  }, []);

  if (!fontsLoaded) return null;

  const data = {
    labels: history.length > 0 ? history.map(h => h.day) : ["N/A"],
    datasets: [
      {
        data: history.length > 0 ? history.map(h => h.value) : [0],
        color: (opacity = 1) => `rgba(67, 100, 104, ${opacity})`,
        strokeWidth: 4
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: "#fdf5e2",
    backgroundGradientTo: "#fdf5e2",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(67, 100, 104, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(67, 100, 104, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726"
    }
  };

  return (
    <ImageBackground
      source={{ uri: "https://images.alphacoders.com/113/thumb-1920-1130469.png" }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>MOOD HISTORY</Text>
        </View>

        <View style={styles.chartContainer}>
            {history.length > 0 ? (
                <LineChart
                    data={data}
                    width={screenWidth * 0.9}
                    height={256}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    fromZero
                    segments={3}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No data yet🌱</Text>
                    <Text style={styles.emptySub}>Start tracking on the Home screen</Text>
                </View>
            )}
        </View>

        <View style={styles.insights}>
            <Text style={styles.insightTitle}>INSIGHTS</Text>
            <Text style={styles.insightText}>
                Consistency is key to understanding your emotional patterns.
            </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, alignItems: "center", padding: 20 },
  header: {
    backgroundColor: "rgba(6, 78, 59, 0.85)",
    borderRadius: 15,
    padding: 15,
    width: "100%",
    marginBottom: 30,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#022c22",
  },
  headerTitle: {
    fontFamily: "PressStart2P",
    fontSize: 16,
    color: "#ffffff",
  },
  chartContainer: {
    backgroundColor: "rgba(253, 245, 226, 0.85)",
    borderRadius: 20,
    padding: 15,
    borderWidth: 4,
    borderColor: "#4a8d91",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  emptyState: {
    height: 256,
    width: screenWidth * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    color: "#436468",
    marginBottom: 10,
  },
  emptySub: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#64748b",
  },
  insights: {
    marginTop: 30,
    backgroundColor: "rgba(253, 245, 226, 0.85)",
    padding: 20,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#4a8d91",
    width: "100%",
  },
  insightTitle: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    color: "#436468",
    marginBottom: 10,
  },
  insightText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
    lineHeight: 16,
  }
});