import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { SupabaseClient } from '@supabase/supabase-js';

const router = Router();

function getAdmin(): SupabaseClient {
  try {
    return getSupabaseAdmin();
  } catch {
    throw new Error('Database not configured');
  }
}

// الحصول على بروفايل المستخدم
router.get('/profile', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await getAdmin()
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// قائمة الطاولات
router.get('/tables', async (_req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('tables')
    .select('*, table_players(*)')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// إنشاء طاولة خاصة
router.post('/tables', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { game_type, name, min_buy_in, is_private, password } = req.body;

  const { data, error } = await getAdmin()
    .from('tables')
    .insert({ game_type, name, min_buy_in, is_private, password })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
