import { supabase } from '../lib/supabase';

// Stores assessment and mood results in user_profiles table

export async function saveAssessmentForUser(userId: string, payload: any) {
  // Get current assessment history
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('assessment_history, riasec_results')
    .eq('id', userId)
    .single();

  const history = profile?.assessment_history || [];

  // Add new assessment to history
  history.push({
    type: 'assessment',
    created_at: new Date().toISOString(),
    payload
  });

  // Update user profile
  const { error } = await supabase
    .from('user_profiles')
    .update({
      riasec_results: payload,
      assessment_history: history,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;
  return userId;
}

export async function saveMoodForUser(userId: string, payload: any) {
  // Get current assessment history
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('assessment_history, mood_results')
    .eq('id', userId)
    .single();

  const history = profile?.assessment_history || [];

  // Add mood result to history
  history.push({
    type: 'mood',
    created_at: new Date().toISOString(),
    payload
  });

  // Update user profile
  const { error } = await supabase
    .from('user_profiles')
    .update({
      mood_results: payload,
      assessment_history: history,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;
  return userId;
}

export async function getSessionsForUser(userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('assessment_history')
    .eq('id', userId)
    .single();

  return profile?.assessment_history || [];
}
