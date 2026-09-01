// ============================================================
// جرب حظك — مخزن الإعدادات (الصوت وغيره)
// إعدادات خفيفة تُحفظ محليًا على الجهاز
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  /** تفعيل المؤثرات الصوتية (توزيع ورق، شرائح، فوز...) */
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
    }),
    {
      name: 'jrbhzk-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
