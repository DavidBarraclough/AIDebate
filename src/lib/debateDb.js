import { supabase } from './supabaseClient'

/**
 * Persist a single debate message/turn. Fire-and-forget safe — always returns a promise.
 */
export async function saveMessage({ debateId, speaker, text, imagePrompt, turnIndex }) {
  const { error } = await supabase
    .from('messages')
    .insert({
      debate_id:    debateId,
      speaker,
      text,
      image_prompt: imagePrompt || null,
      turn_index:   turnIndex,
    })
  if (error) throw error
}

/**
 * Store the AI-generated summary on the debate row once the session ends.
 */
export async function updateDebateSummary(debateId, summary) {
  const { error } = await supabase
    .from('debates')
    .update({ summary })
    .eq('id', debateId)
  if (error) throw error
}

/**
 * Fetch a user's debate history (most recent first, capped at 50).
 */
export async function getUserDebates(userId) {
  const { data, error } = await supabase
    .from('debates')
    .select('id, topic, style, category, created_at, summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

/**
 * Fetch a single debate with all its messages (used for replay — Day 3).
 */
export async function getDebateWithMessages(debateId) {
  const [debateResult, messagesResult] = await Promise.all([
    supabase.from('debates').select('*').eq('id', debateId).single(),
    supabase.from('messages').select('*').eq('debate_id', debateId).order('turn_index', { ascending: true }),
  ])
  if (debateResult.error) throw debateResult.error
  if (messagesResult.error) throw messagesResult.error
  return { debate: debateResult.data, messages: messagesResult.data }
}
