import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../constants/config";
import {
  useFonts,
  PressStart2P_400Regular,
} from "@expo-google-fonts/press-start-2p";

const GENRES = [
  "Lo-fi", "Ambient", "Classical", "Nature", "Piano", "Zen",
  "Rain", "Forest", "Ocean", "Deep Space", "Binaural", "White Noise",
  "Meditation", "Yoga", "Chillhop", "Jazz", "Acoustic", "Celtic",
  "Tibetan", "Harp", "Fluite", "Birds", "Thunder", "Wind",
  "Minimalist", "Sleep", "Focus", "Soft Pop", "Soul", "Healing"
];

export default function ZenDeckScreen() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const { token } = useAuth();
  const [fontsLoaded] = useFonts({ PressStart2P: PressStart2P_400Regular });

  const fetchPreferences = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/music/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedGenres(response.data.genres || []);
    } catch (error) {
      console.error("Failed to fetch preferences", error);
    }
  };

  const fetchRecommendations = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/music/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecommendations(response.data);
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
    }
  };

  useEffect(() => {
    fetchPreferences();
    fetchRecommendations();
  }, [token]);

  const toggleGenre = async (genre: string) => {
    let newGenres;
    if (selectedGenres.includes(genre)) {
      newGenres = selectedGenres.filter((g) => g !== genre);
    } else {
      newGenres = [...selectedGenres, genre];
    }
    setSelectedGenres(newGenres);

    try {
      await axios.post(
        `${API_URL}/music/preferences`,
        { genres: newGenres },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRecommendations();
    } catch (error) {
      Alert.alert("Error", "Failed to save preferences");
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={{ uri: "https://images.alphacoders.com/113/thumb-1920-1130469.png" }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="disc" size={24} color="#fff" />
          <Text style={styles.headerTitle}>ZEN DECK</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>SELECT GENRES</Text>
            <View style={styles.genreContainer}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreBtn,
                    selectedGenres.includes(genre) && styles.genreBtnActive,
                  ]}
                  onPress={() => toggleGenre(genre)}
                >
                  <Text
                    style={[
                      styles.genreText,
                      selectedGenres.includes(genre) && styles.genreTextActive,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>RECOMMENDATIONS</Text>
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <View key={index} style={styles.recCard}>
                  <View>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <Text style={styles.recGenre}>{rec.genre}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => Linking.openURL(rec.url)}
                  >
                    <MaterialCommunityIcons name="play" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Select genres to get music🌱</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, padding: 20 },
  header: {
    backgroundColor: "rgba(6, 78, 59, 0.85)",
    borderRadius: 15,
    padding: 15,
    width: "100%",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#022c22",
  },
  headerTitle: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#ffffff",
    marginLeft: 10,
  },
  scrollContent: { paddingBottom: 100 },
  sectionCard: {
    backgroundColor: "rgba(253, 245, 226, 0.9)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 4,
    borderColor: "#4a8d91",
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    color: "#436468",
    marginBottom: 15,
    textAlign: "center",
  },
  genreContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  genreBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 2,
    borderColor: "#cbd5d0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    margin: 5,
  },
  genreBtnActive: {
    backgroundColor: "#60a5a1",
    borderColor: "#3e6d6a",
  },
  genreText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
  },
  genreTextActive: {
    color: "#fff",
  },
  recCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#cbd5d0",
  },
  recTitle: {
    fontFamily: "PressStart2P",
    fontSize: 9,
    color: "#436468",
    marginBottom: 5,
  },
  recGenre: {
    fontFamily: "PressStart2P",
    fontSize: 7,
    color: "#64748b",
  },
  playBtn: {
    backgroundColor: "#4a8d91",
    padding: 10,
    borderRadius: 10,
  },
  emptyText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
});