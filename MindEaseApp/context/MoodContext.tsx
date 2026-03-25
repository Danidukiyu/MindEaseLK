import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_URL } from "../constants/config";

export type MoodEntry = {
  day: string; 
  value: number; 
};

type MoodContextType = {
  history: MoodEntry[];
  fetchMoods: () => Promise<void>;
};

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const { token } = useAuth();

  const fetchMoods = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/moods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const mapped = response.data.map((item: any) => ({
        day: days[new Date(item.submission_date).getDay()],
        value: item.mood_value
      }));
      setHistory(mapped);
    } catch (error) {
      console.error("Failed to fetch moods", error);
    }
  };

  useEffect(() => {
    fetchMoods();
  }, [token]);

  return (
    <MoodContext.Provider value={{ history, fetchMoods }}>
      {children}
    </MoodContext.Provider>
  );
};

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) throw new Error("useMood must be used within a MoodProvider");
  return context;
};