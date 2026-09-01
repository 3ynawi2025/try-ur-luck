// ============================================================
// جرب حظك — مدير المؤثرات الصوتية
// أصوات خفيفة مولّدة محليًا (WAV) تُشغَّل عبر expo-audio
// ============================================================

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '../stores/settingsStore';

export type SfxName = 'deal' | 'chip' | 'win' | 'lose' | 'tick' | 'shuffle';

const SOURCES: Record<SfxName, number> = {
  deal: require('../../assets/sounds/deal.wav'),
  chip: require('../../assets/sounds/chip.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
};

const VOLUMES: Record<SfxName, number> = {
  deal: 0.75,
  chip: 0.65,
  win: 0.8,
  lose: 0.55,
  tick: 0.5,
  shuffle: 0.5,
};

const players = new Map<SfxName, AudioPlayer>();
let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    audioModeReady = true;
  } catch {
    // تجاهل — قد لا يتوفر على بعض المنصات
  }
}

/**
 * تشغيل مؤثر صوتي مرة واحدة (يرجع للبداية إن كان قيد التشغيل).
 * يُحترم إعداد كتم الصوت من مخزن الإعدادات تلقائيًا.
 */
export function playSfx(name: SfxName) {
  if (!useSettingsStore.getState().soundEnabled) return;
  void ensureAudioMode().then(() => {
    try {
      let player = players.get(name);
      if (!player) {
        player = createAudioPlayer(SOURCES[name]);
        player.volume = VOLUMES[name];
        players.set(name, player);
      }
      player.seekTo(0);
      player.play();
    } catch {
      // فشل صوتي صامت — لا يعطّل اللعبة
    }
  });
}

/** مؤثرات جاهزة الاستخدام */
export const sfx = {
  deal: () => playSfx('deal'),
  chip: () => playSfx('chip'),
  win: () => playSfx('win'),
  lose: () => playSfx('lose'),
  tick: () => playSfx('tick'),
  shuffle: () => playSfx('shuffle'),
};
