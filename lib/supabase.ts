import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://mbtvouolkppzhwqvmfgj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_B1wwxo0eLAgirZ9QNqfjLA_Yhq_j-H9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
