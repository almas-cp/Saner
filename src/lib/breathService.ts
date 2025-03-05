import { supabase } from './supabase';

export const BreathService = {
  fetchMoodHistory: async (userId: string) => {
    return supabase
      .from('mood_entries')
      .select('value, created_at')
      .eq('user_id', userId);
  }
};
