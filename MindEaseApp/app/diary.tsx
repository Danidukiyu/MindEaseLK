import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Dimensions,
  Animated,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
const DIGIT_HEIGHT = 40; // Reverted for better visibility/fit
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
        Haptics.selectionAsync(); 
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

export default function DiaryScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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
  const flatListRef = useRef<FlatList>(null);
  const pickerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchEntries();
  }, [token]);

  useEffect(() => {
    Animated.timing(pickerAnimation, {
      toValue: showDatePicker ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showDatePicker]);

  const fetchEntries = async (query = "") => {
    if (!token) return;
    try {
      const url = query ? `${API_URL}/diary/search?q=${query}` : `${API_URL}/diary`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(response.data);
    } catch (error) {
      console.error("Failed to fetch diary entries", error);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;
    try {
      if (editingId) {
        await axios.put(
          `${API_URL}/diary/${editingId}`,
          { content: newEntry },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditingId(null);
        Toast.show({ type: 'success', text1: 'Entry Updated', text2: 'Changes saved successfully! 🌱' });
      } else {
        await axios.post(
          `${API_URL}/diary`,
          { content: newEntry },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Toast.show({ type: 'success', text1: 'Entry Saved', text2: 'Your thoughts are safe with us. 🌱' });
      }
      setNewEntry("");
      setIsFocused(false);
      fetchEntries();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Could not save your diary entry.';
      Toast.show({ type: 'error', text1: 'Save Failed', text2: msg });
    }
  };

  const handleEdit = (entry: any) => {
    setNewEntry(entry.content);
    setEditingId(entry.id);
    setIsFocused(true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleSearch = () => {
    fetchEntries(searchQuery);
  };

  const filteredEntries = entries.filter(entry => {
    if (!isFilterEnabled) return true;
    const entryDate = entry.created_at.split('T')[0];
    const targetDate = `${yDigits.join('')}-${mDigits.join('')}-${dDigits.join('')}`;
    return entryDate === targetDate;
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

  const isWritingMode = isFocused || editingId !== null;

  const renderHeader = () => (
    <View>
      {!isWritingMode && (
        <>
          <View style={styles.header}>
            <FontAwesome5 name="book-medical" size={20} color="#fff" />
            <Text style={styles.headerTitle}>MIND DIARY</Text>
          </View>

          <View style={styles.filterSection}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search text..."
                placeholderTextColor="#436468"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Ionicons name="search" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerControlsRow}>
                <TouchableOpacity 
                    style={[styles.dateToggleBtn, isFilterEnabled && styles.dateToggleBtnActive]}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                >
                    <MaterialCommunityIcons name="calendar-search" size={20} color={isFilterEnabled ? "#fff" : "#4a8d91"} />
                    <Text style={[styles.dateToggleText, isFilterEnabled && {color: '#fff'}]}>
                        {isFilterEnabled ? `${yDigits.join('')}-${mDigits.join('')}-${dDigits.join('')}` : "SELECT DATE"}
                    </Text>
                </TouchableOpacity>

                <View style={styles.filterSwitchBox}>
                    <Text style={styles.filterLabel}>FILTER</Text>
                    <Switch 
                        value={isFilterEnabled} 
                        onValueChange={setIsFilterEnabled}
                        trackColor={{ false: "#cbd5d0", true: "#4a8d91" }}
                        thumbColor={isFilterEnabled ? "#fff" : "#f4f3f4"}
                    />
                </View>
            </View>

            {showDatePicker && (
                <Animated.View style={[styles.datePickerExpanded, { opacity: pickerAnimation }]}>
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
                    <TouchableOpacity 
                        style={styles.confirmDateBtn}
                        onPress={() => {
                            setShowDatePicker(false);
                            setIsFilterEnabled(true);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                    >
                        <Text style={styles.confirmDateText}>CONFIRM DATE</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
          </View>
        </>
      )}

      {isWritingMode && (
        <View style={styles.writingHeader}>
            <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => {
                    setIsFocused(false);
                    setEditingId(null);
                    setNewEntry("");
                }}
            >
                <Ionicons name="arrow-back" size={24} color="#436468" />
                <Text style={styles.backBtnText}>BACK</Text>
            </TouchableOpacity>
            <Text style={styles.writingTitle}>{editingId ? 'EDITING' : 'WRITING'}</Text>
        </View>
      )}

      <View style={[styles.inputCard, isWritingMode && styles.inputCardFullScreen]}>
        <TextInput
          style={[styles.diaryInput, isWritingMode && styles.diaryInputFullScreen]}
          placeholder="Dear Diary, today I..."
          placeholderTextColor="#436468"
          multiline
          value={newEntry}
          onChangeText={setNewEntry}
          onFocus={() => {
              setIsFocused(true);
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />
        <View style={styles.inputFooter}>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddEntry}>
              <Text style={styles.addBtnText}>{editingId ? 'UPDATE' : 'SAVE'}</Text>
            </TouchableOpacity>
            {isWritingMode && (
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: '#94a3b8', marginLeft: 10 }]} 
                onPress={() => {
                  setEditingId(null);
                  setIsFocused(false);
                  setNewEntry("");
                }}
              >
                <Text style={styles.addBtnText}>CANCEL</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>

      {!isWritingMode && !showDatePicker && filteredEntries.length > 0 && (
          <View style={styles.historyDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HISTORY</Text>
              <View style={styles.dividerLine} />
          </View>
      )}
    </View>
  );

  return (
    <ImageBackground
      source={{ uri: "https://images.alphacoders.com/113/thumb-1920-1130469.png" }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={(isWritingMode || showDatePicker) ? [] : filteredEntries}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={renderHeader}
            scrollEnabled={!showDatePicker}
            renderItem={({ item }) => (
              <View style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>
                    {new Date(item.created_at).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <TouchableOpacity onPress={() => handleEdit(item)}>
                    <Ionicons name="pencil" size={16} color="#4a8d91" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.entryContent}>{item.content}</Text>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              (!isWritingMode && !showDatePicker) ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No entries found.</Text>
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  header: {
    backgroundColor: "rgba(6, 78, 59, 0.85)",
    borderRadius: 15,
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
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
  writingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 15,
    marginBottom: 10,
  },
  writingTitle: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#436468",
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 245, 226, 0.9)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4a8d91',
  },
  backBtnText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
    marginLeft: 5,
  },
  filterSection: {
    marginHorizontal: 15,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(253, 245, 226, 0.9)",
    borderWidth: 3,
    borderColor: "#4a8d91",
    borderRadius: 10,
    padding: 12,
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#436468",
  },
  searchBtn: {
    backgroundColor: "#4a8d91",
    padding: 10,
    borderRadius: 10,
    marginLeft: 10,
    justifyContent: "center",
  },
  pickerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 245, 226, 0.9)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#4a8d91',
    marginRight: 10,
  },
  dateToggleBtnActive: {
    backgroundColor: '#4a8d91',
  },
  dateToggleText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#4a8d91",
    marginLeft: 8,
  },
  filterSwitchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 245, 226, 0.9)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#4a8d91',
  },
  filterLabel: {
    fontFamily: "PressStart2P",
    fontSize: 7,
    color: "#436468",
    marginRight: 5,
  },
  datePickerExpanded: {
    backgroundColor: "rgba(253, 245, 226, 0.98)",
    borderRadius: 20,
    padding: 5,
    borderWidth: 4,
    borderColor: "#4a8d91",
    alignItems: 'center',
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10 },
        android: { elevation: 10 }
    })
  },
  slotMachineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67, 100, 104, 0.05)',
    padding: 5,
    borderRadius: 15,
    width: '100%',
  },
  digitGroup: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4a8d91',
    overflow: 'hidden',
    height: VISIBLE_HEIGHT,
  },
  digitScrollBox: {
    width: 40,
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
    fontSize: 12,
    color: "#cbd5e1",
  },
  digitTextActive: {
    color: "#4ade80",
    fontSize: 16,
  },
  divider: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    marginHorizontal: 5,
    color: "#4a8d91",
  },
  confirmDateBtn: {
    backgroundColor: "#4a8d91",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderBottomWidth: 4,
    borderBottomColor: '#2c4245',
    width: '100%',
    alignItems: 'center',
  },
  confirmDateText: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#fff",
  },
  inputCard: {
    backgroundColor: "rgba(253, 245, 226, 0.9)",
    borderRadius: 20,
    padding: 15,
    borderWidth: 4,
    borderColor: "#4a8d91",
    marginHorizontal: 15,
    marginBottom: 15,
  },
  inputCardFullScreen: {
    flex: 1,
    height: screenHeight * 0.75,
    marginTop: 5,
  },
  diaryInput: {
    height: 80,
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
    textAlignVertical: "top",
  },
  diaryInputFullScreen: {
    height: '88%',
    fontSize: 12,
    lineHeight: 24,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  addBtn: {
    backgroundColor: "#60a5a1",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    borderBottomWidth: 4,
    borderColor: "#3e6d6a",
  },
  addBtnText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#fff",
  },
  historyDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 15,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(74, 141, 145, 0.3)',
  },
  dividerText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#4a8d91",
    marginHorizontal: 10,
  },
  listContainer: { paddingBottom: 100 },
  entryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    marginHorizontal: 15,
    borderWidth: 2,
    borderColor: "#cbd5d0",
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontFamily: "PressStart2P",
    fontSize: 7,
    color: "#64748b",
  },
  entryContent: {
    fontFamily: "PressStart2P",
    fontSize: 10,
    color: "#436468",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 30,
  },
  emptyText: {
    fontFamily: "PressStart2P",
    fontSize: 8,
    color: "#64748b",
  }
});