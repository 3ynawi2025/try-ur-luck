// ============================================================
// جرب حظك — قفل اتجاه الشاشة لطاولات اللعب
// الطاولات عرضية (landscape) وبقية التطبيق طولي (portrait).
//
// مهم: الحماية نفسها المطبقة على الأصوات — الوحدة الأصلية قد
// لا توجد في بنى قديمة، لذلك نفحصها بـ requireOptionalNativeModule
// قبل الاستيراد حتى لا ينهار التطبيق (Metro يحوّل استثناءات
// الاستيراد إلى أخطاء قاتلة تتجاوز try/catch).
// ============================================================

import { useEffect } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';

declare const require: (id: string) => any;

type OrientationLib = {
  lockAsync: (lock: any) => Promise<void>;
  unlockAsync: () => Promise<void>;
  OrientationLock: { LANDSCAPE: any; PORTRAIT_UP: any };
};

let lib: OrientationLib | null | undefined;

function getOrientationLib(): OrientationLib | null {
  if (lib === undefined) {
    const native = requireOptionalNativeModule('ExpoScreenOrientation');
    if (!native) {
      lib = null; // بنية قديمة بلا الوحدة — لا تحويل للاتجاه
    } else {
      try {
        lib = require('expo-screen-orientation') as OrientationLib;
      } catch {
        lib = null;
      }
    }
  }
  return lib;
}

/** قفل الشاشة عرضيًا (لطاولات اللعب) */
export function lockLandscape() {
  const L = getOrientationLib();
  if (!L) return;
  L.lockAsync(L.OrientationLock.LANDSCAPE).catch(() => {});
}

/** قفل الشاشة طوليًا (للبقية التطبيق) */
export function lockPortrait() {
  const L = getOrientationLib();
  if (!L) return;
  L.lockAsync(L.OrientationLock.PORTRAIT_UP).catch(() => {});
}

/** هوك: عرضي أثناء بقاء الطاولة مفتوحة، وطولي عند الخروج */
export function useLandscapeLock() {
  useEffect(() => {
    lockLandscape();
    return () => {
      lockPortrait();
    };
  }, []);
}
