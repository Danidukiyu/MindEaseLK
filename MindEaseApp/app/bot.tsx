import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Switch,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../constants/config";
import {
  useFonts,
  PressStart2P_400Regular,
} from "@expo-google-fonts/press-start-2p";
import Toast from 'react-native-toast-message';
import { SafeAreaView } from "react-native-safe-area-context";

import * as Haptics from 'expo-haptics';

const DIGIT_HEIGHT = 40;
const VISIBLE_HEIGHT = DIGIT_HEIGHT * 3;

const DigitScroll = ({ initialValue, onChange, isLast }: { initialValue: number; onChange: (v: number) => void; isLast?: boolean }) => {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(initialValue);
  const lastTickIndex = useRef(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: initialValue * DIGIT_HEIGHT, animated: false });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / DIGIT_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(9, idx));
    
    if (clampedIdx !== lastTickIndex.current) {
        lastTickIndex.current = clampedIdx;
        setActiveIndex(clampedIdx);
        onChange(clampedIdx);
        Haptics.selectionAsync(); // Provide tactical feedback on selection change
    }
  };

  return (
    <View style={[styles.digitScrollBox, isLast && { borderRightWidth: 0 }]}>
      <View style={styles.centerIndicator} />
      <FlatList
        ref={flatListRef}
        data={digits}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <View style={styles.digitItem}>
            <Text style={[
                styles.digitText,
                activeIndex === item && styles.digitTextActive
            ]}>
                {item}
            </Text>
          </View>
        )}
        ListHeaderComponent={<View style={{ height: DIGIT_HEIGHT }} />}
        ListFooterComponent={<View style={{ height: DIGIT_HEIGHT }} />}
        snapToInterval={DIGIT_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: DIGIT_HEIGHT,
          offset: DIGIT_HEIGHT * index,
          index,
        })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
      />
    </View>
  );
};

export default function BotScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  
  const today = new Date();
  const tY = today.getFullYear().toString();
  const tM = (today.getMonth() + 1).toString().padStart(2, '0');
  const tD = today.getDate().toString().padStart(2, '0');

  const [yDigits, setYDigits] = useState([parseInt(tY[0]), parseInt(tY[1]), parseInt(tY[2]), parseInt(tY[3])]);
  const [mDigits, setMDigits] = useState([parseInt(tM[0]), parseInt(tM[1])]);
  const [dDigits, setDDigits] = useState([parseInt(tD[0]), parseInt(tD[1])]);
  const [isFilterEnabled, setIsFilterEnabled] = useState(false);

  const { token } = useAuth();
  const [fontsLoaded] = useFonts({ PressStart2P: PressStart2P_400Regular });
  const scrollViewRef = useRef<ScrollView>(null);
  const isRequesting = useRef(false);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/bot/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(response.data);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    }
  };

  const fetchHistory = async (sessionId: number | null) => {
    if (!token) return;
    if (sessionId === null) {
      setMessages([]);
      return;
    }
    try {
      const url = `${API_URL}/bot/history?session_id=${sessionId}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const history: any[] = [];
      response.data.forEach((msg: any) => {
        history.push({ text: msg.message, sender: "user", id: msg.id + "_u" });
        history.push({ text: msg.response, sender: "bot", id: msg.id + "_b" });
      });
      setMessages(history);
    } catch (error) {
      console.error("Failed to fetch bot history", error);
    }
  };

  useEffect(() => {
    if (token) fetchSessions();
  }, [token]);

  useEffect(() => {
    if (token) fetchHistory(currentSessionId);
  }, [token, currentSessionId]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending || isRequesting.current) return;
    isRequesting.current = true;
    const userMsg = { text: inputText, sender: "user", id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    const messageToSend = inputText;
    setInputText("");
    setIsSending(true);
    try {
      const response = await axios.post(
        `${API_URL}/bot/chat`,
        { message: messageToSend, session_id: currentSessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const botMsg = { text: response.data.response, sender: "bot", id: (Date.now() + 1).toString() };
      setMessages((prev) => [...prev, botMsg]);
      if (!currentSessionId && response.data.session_id) {
        setCurrentSessionId(response.data.session_id);
        fetchSessions(); 
      }
    } catch (error: any) {
      console.error("Failed to send message", error);
      const msg = error.response?.data?.error || "Failed to reach AI companion.";
      Toast.show({
        type: 'error',
        text1: 'AI Error',
        text2: msg,
      });
    } finally {
      setIsSending(false);
      isRequesting.current = false;
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowSessions(false);
  };

  const selectSession = (id: number) => {
    if (id === currentSessionId) {
      setShowSessions(false);
      return;
    }
    setMessages([]); 
    setCurrentSessionId(id);
    setShowSessions(false); 
  };

  const filteredSessions = sessions.filter(session => {
    if (!isFilterEnabled) return true;
    const sessionDate = session.created_at.split('T')[0]; 
    const targetDate = `${yDigits.join('')}-${mDigits.join('')}-${dDigits.join('')}`;
    return sessionDate === targetDate;
  });

  const updateY = (idx: number, val: number) => {
    const next = [...yDigits];
    next[idx] = val;
    setYDigits(next);
  };

  const updateM = (idx: number, val: number) => {
    const next = [...mDigits];
    next[idx] = val;
    setMDigits(next);
  };

  const updateD = (idx: number, val: number) => {
    const next = [...dDigits];
    next[idx] = val;
    setDDigits(next);
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={{ uri: "https://images.alphacoders.com/113/thumb-1920-1130469.png" }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (!showSessions) fetchSessions(); 
            setShowSessions(!showSessions);
          }} style={styles.menuBtn}>
            <MaterialCommunityIcons name={showSessions ? "close-box" : "history"} size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{showSessions ? "HISTORY" : "AI COMPANION"}</Text>
          <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn}>
            <MaterialCommunityIcons name="plus-box" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {showSessions ? (
          <View style={styles.sessionsPanelFull}>
            <Text style={styles.sessionsTitle}>FILTER BY DATE</Text>
            
            <View style={styles.slotMachineContainer}>
                <View style={styles.digitGroup}>
                    <DigitScroll initialValue={yDigits[0]} onChange={(v) => updateY(0, v)} />
                    <DigitScroll initialValue={yDigits[1]} onChange={(v) => updateY(1, v)} />
                    <DigitScroll initialValue={yDigits[2]} onChange={(v) => updateY(2, v)} />
                    <DigitScroll initialValue={yDigits[3]} onChange={(v) => updateY(3, v)} isLast />
                </View>
                <Text style={styles.divider}>-</Text>
                <View style={styles.digitGroup}>
                    <DigitScroll initialValue={mDigits[0]} onChange={(v) => updateM(0, v)} />
                    <DigitScroll initialValue={mDigits[1]} onChange={(v) => updateM(1, v)} isLast />
                </View>
                <Text style={styles.divider}>-</Text>
                <View style={styles.digitGroup}>
                    <DigitScroll initialValue={dDigits[0]} onChange={(v) => updateD(0, v)} />
                    <DigitScroll initialValue={dDigits[1]} onChange={(v) => updateD(1, v)} isLast />
                </View>
            </View>

            <View style={styles.filterControl}>
                <Text style={styles.filterLabel}>ACTIVATE FILTER</Text>
                <Switch 
                    value={isFilterEnabled} 
                    onValueChange={setIsFilterEnabled}
                    trackColor={{ false: "#767577", true: "#4a8d91" }}
                    thumbColor={isFilterEnabled ? "#fff" : "#f4f3f4"}
                />
            </View>

            <FlatList
              data={filteredSessions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.sessionItem, currentSessionId === item.id && styles.activeSession]} 
                  onPress={() => selectSession(item.id)}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionText} numberOfLines={1}>
                      {item.title || "Untitled Chat"}
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(item.created_at).toLocaleDateString('en-CA')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#4a8d91" />
                </TouchableOpacity>
              )}
              style={styles.sessionsList}
              ListEmptyComponent={
                <Text style={styles.emptySessionText}>No chats found.</Text>
              }
            />
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.chatArea}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 && !isSending && (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="robot" size={60} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={styles.emptyTextWhite}>Hello! How can I help you today?</Text>
                </View>
              )}
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    msg.sender === "bot" ? styles.botBubble : styles.userBubble,
                  ]}
                >
                  <Text style={styles.bubbleText}>{msg.text}</Text>
                </View>
              ))}
              {isSending && (
                <View style={[styles.bubble, styles.botBubble]}>
                  <ActivityIndicator size="small" color="#436468" />
                </View>
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "padding"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#436468"
                  value={inputText}
                  onChangeText={setInputText}
                  editable={!isSending}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isSending}>
                  <MaterialCommunityIcons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, padding: 15 },
  header: {
    backgroundColor: "rgba(6, 78, 59, 0.85)",
    borderRadius: 15,
    padding: 12,
    width: "100%",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 4,
    borderBottomColor: "#022c22",
  },
  menuBtn: { padding: 5 },
  newChatBtn: { padding: 5 },
  headerTitle: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    color: "#ffffff",
  },
  sessionsPanelFull: {
    flex: 1,
    backgroundColor: "rgba(253, 245, 226, 0.95)",
    borderRadius: 20,
    padding: 15,
    marginBottom: 80, 
    borderWidth: 4,
    borderColor: "#4a8d91",
  },
  sessionsTitle: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
    marginBottom: 15,
    textAlign: "center",
  },
  slotMachineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67, 100, 104, 0.1)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 15,
  },
  digitGroup: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4a8d91',
    overflow: 'hidden',
    height: VISIBLE_HEIGHT,
  },
  digitScrollBox: {
    width: 30, 
    height: VISIBLE_HEIGHT,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  centerIndicator: {
    position: 'absolute',
    top: DIGIT_HEIGHT,
    left: 0,
    right: 0,
    height: DIGIT_HEIGHT,
    backgroundColor: 'rgba(74, 171, 128, 0.1)',
    zIndex: 0,
  },
  digitItem: {
    height: DIGIT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#cbd5e1", 
  },
  digitTextActive: {
    color: "#4ade80", 
    fontSize: 14,
  },
  divider: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    marginHorizontal: 2,
    color: "#4a8d91",
  },
  filterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  filterLabel: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
    marginRight: 10,
  },
  sessionsList: { flex: 1 },
  sessionItem: {
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(67, 100, 104, 0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  sessionInfo: { flex: 1 },
  activeSession: {
    backgroundColor: "rgba(74, 141, 145, 0.15)",
    borderRadius: 10,
  },
  sessionText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
    marginBottom: 5,
  },
  sessionDate: {
    fontFamily: "PressStart2P",
    fontSize: 6,
    color: "#64748b",
  },
  emptySessionText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#64748b",
    textAlign: 'center',
    marginTop: 30,
  },
  chatArea: { paddingVertical: 10, paddingBottom: 20 },
  emptyState: { alignItems: "center", marginTop: 50, opacity: 0.9 },
  emptyTextWhite: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#ffffff",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  bubble: {
    padding: 12,
    borderRadius: 15,
    maxWidth: "85%",
    marginBottom: 15,
    borderBottomWidth: 4,
    borderColor: "#cbd5d0",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(253, 245, 226, 0.9)",
    borderRightWidth: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderLeftWidth: 4,
  },
  bubbleText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
    lineHeight: 16,
  },
  inputContainer: { flexDirection: "row", marginBottom: 65 },
  input: {
    flex: 1,
    backgroundColor: "rgba(253, 245, 226, 0.9)",
    borderRadius: 10,
    padding: 12,
    fontFamily: "PressStart2P",
    fontSize: 8,
    borderWidth: 3,
    borderColor: "#4a8d91",
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: "#4a8d91",
    width: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});