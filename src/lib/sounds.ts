// ============================================================
// جرب حظك — مدير المؤثرات الصوتية
// أصوات خفيفة مولّدة محليًا (WAV) تُشغَّل عبر expo-audio
//
// مهم: التحميل كسول وآمن — الوحدة الأصلية 'ExpoAudio' قد لا
// توجد في بنى أقدم (قبل إضافة expo-audio). في هذه الحالة تُعطَّل
// الأصوات بصمت بدل انهيار التطبيق، فيصل التحديث الهوائي بأمان
// لكل الأجهزة وتعمل بقية الميزات (رهانات الروليت وغيرها) طبيعيًا.
// ============================================================

import { useSettingsStore } from '../stores/settingsStore';

export type SfxName = 'deal' | 'chip' | 'win' | 'lose' | 'tick' | 'shuffle';

declare const require: (id: string) => any;

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

type AudioLib = {
  createAudioPlayer: (source: number) => any;
  setAudioModeAsync: (mode: { playsInSilentMode: boolean }) => Promise<void>;
};

let lib: AudioLib | null | undefined;

/** تحميل آمن للوحدة الأصلية — يُرجع null في البنى القديمة بلا انهيار */
function getAudioLib(): AudioLib | null {
  if (lib === undefined) {
    try {
      // استدعاء حرفي حتى يضمّنه Metro في الحزمة
      lib = require('expo-audio') as AudioLib;
    } catch {
      lib = null; // الوحدة الأصلية غير موجودة — أصوات معطّلة بأمان
    }
  }
  return lib;
}

const players = new Map<SfxName, any>();
let audioModeReady = false;

async function ensureAudioMode(a: AudioLib) {
  if (audioModeReady) return;
  try {
    await a.setAudioModeAsync({ playsInSilentMode: true });
    audioModeReady = true;
  } catch {
    // تجاهل — قد لا يتوفر على بعض المنصات
  }
}

/**
 * تشغيل مؤثر صوتي مرة واحدة (يرجع للبداية إن كان قيد التشغيل).
 * يُحترم إعداد كتم الصوت، ويتجاهل بصمت إذا لم تتوفر الوحدة الأصلية.
 */
export function playSfx(name: SfxName) {
  if (!useSettingsStore.getState().soundEnabled) return;
  const a = getAudioLib();
  if (!a) return;
  void ensureAudioMode(a).then(() => {
    try {
      let player = players.get(name);
      if (!player) {
        player = a.createAudioPlayer(SOURCES[name]);
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
