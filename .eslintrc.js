// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/node_modules/*', '/.expo/*'],
  rules: {
    // نمط RN Animated المعتاد يقرأ Animated.Value.current داخل الـrender
    // (interpolate/transform) — وهو نمط آمن ومستقر؛ القاعدة الجديدة
    // react-hooks/refs تخطئ في كل شاشات الحركة تقريبًا (132 خطأً تاريخيًا).
    'react-hooks/refs': 'off',
  },
};
