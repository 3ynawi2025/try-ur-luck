// إعدادات المشروع
// Production: استخدم متغيرات البيئة (EXPO_PUBLIC_*)

// مفاتيح Supabase العامة (anon key ليس سرًا — يُرسل مع التطبيق)
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://iycuncfqxjlcqhupyvyq.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Y3VuY2ZxeGpsY3FodXB5dnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODY3NDcsImV4cCI6MjEwMjA2Mjc0N30.j2IqirDEcqOOC2aIjLjUJIuKw7k_skyG53RZUXZxUFM';

// عنوان خادم اللعبة (REST + Socket.io)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// معرف تطبيق Agora (الصوت) — App ID (عام، يُرسل مع التطبيق)
export const AGORA_APP_ID =
  process.env.EXPO_PUBLIC_AGORA_APP_ID || 'cd0d928f09c14ec192574a8c4358d08e';
