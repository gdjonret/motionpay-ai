import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Notice, Tag } from '@/components/Notice';
import { ExerciseDemonstration } from '@/components/ExerciseDemonstration';
import { ExerciseMediaFallback } from '@/components/ExerciseMediaFallback';
import { colors, radii, type } from '@/theme';
import { exercises, type Exercise } from '@/data/exercises';
import { askCoach, type ChatTurn } from '@/services/chat';
import { ProgramRecommendation } from '@/components/ProgramRecommendation';
import { PlanBuilderCard } from '@/components/PlanBuilderCard';
import { ExerciseRow } from '@/components/ExerciseRow';
import { useAuth } from '@/components/AuthProvider';
import type { PropsWithChildren } from 'react';

type Message = { id: number; prompt: string; exercise?: Exercise; relatedExercises?: Exercise[]; followUps?: string[]; text: string; youtubeQuery?: string | null; programId?: string | null };

const suggestions = ['Show me jumping jacks', 'Build me a 3-day dumbbell plan for glutes', 'I’m a beginner and want to get stronger'];
function MediaSlot({ active, children }: PropsWithChildren<{ active: boolean }>) {
  const [height, setHeight] = useState(400);
  return <View style={active ? undefined : { height }} onLayout={event => {
    if (active) { const next = event.nativeEvent.layout.height; setHeight(previous => Math.abs(previous - next) > 1 ? next : previous); }
  }}>{active ? children : null}</View>;
}
export default function CoachScreen() {
  const { session } = useAuth();
  const [generation, setGeneration] = useState(0);
  return <CoachSession key={`${session?.user.id || 'guest'}:${generation}`} onNewChat={() => setGeneration(value => value + 1)} />;
}

function CoachSession({ onNewChat }: { onNewChat: () => void }) {
  const { session } = useAuth();
  const { question, requestId } = useLocalSearchParams<{ question?: string; requestId?: string }>();
  const lastRequest = useRef<string | undefined>(undefined);
  const busy = useRef(false);
  const mounted = useRef(true);
  const history = useRef<ChatTurn[]>([]);
  const nextMessageId = useRef(0);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const failedQuestion = useRef('');
  const request = useRef<AbortController | null>(null);
  const list = useRef<FlatList<Message>>(null);
  const atBottom = useRef(true);
  const [visible, setVisible] = useState<number[]>([]);
  const viewability = useCallback(({ viewableItems }: { viewableItems: { item: Message }[] }) => setVisible(viewableItems.map(item => item.item.id)), []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  const send = useCallback(async (questionText: string) => {
    const text = questionText.trim();
    if (!text || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    failedQuestion.current = text;
    setPendingQuestion(text);
    try {
      request.current = new AbortController();
      const reply = await askCoach(text, history.current, request.current.signal);
      if (!mounted.current) return;
      const original = exercises.find(item => item.id === reply.exercise_id);
      const exercise = original && reply.gif_url ? { ...original, gifPath: reply.gif_url, gifCredit: original.gifCredit ? { ...original.gifCredit, changes: 'Playback slowed to 0.5×; original artwork unchanged' } : undefined } : original;
      const id = nextMessageId.current++;
      setMessages(previous => [...previous, { id, prompt: text, exercise, relatedExercises: [...new Set(reply.related_exercise_ids ?? [])].filter(id => id !== reply.exercise_id).map(id => exercises.find(item => item.id === id)!).filter(Boolean), followUps: reply.follow_ups ?? [], text: reply.text, youtubeQuery: reply.youtube_query, programId: reply.program_id }].slice(-100));
      history.current = [...history.current, { role: 'user', content: text }, { role: 'assistant', content: reply.text, exercise_id: reply.exercise_id, related_exercise_ids: reply.related_exercise_ids, youtube_query: reply.youtube_query }].slice(-12) as ChatTurn[];
      failedQuestion.current = '';
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Unable to get a response. Please try again.');
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!question?.trim() || !requestId || lastRequest.current === requestId || busy.current) return;
    lastRequest.current = requestId;
    void send(question);
    // Defer clearing the URL params: on a direct deep link the navigator may not be ready yet.
    const timer = setTimeout(() => { try { router.setParams({ question: undefined, requestId: undefined }); } catch { /* params are already handled via lastRequest */ } }, 0);
    return () => clearTimeout(timer);
  }, [question, requestId, send, loading]);
  const submit = () => {
    if (!prompt.trim() || busy.current) return;
    void send(prompt);
    setPrompt('');
    atBottom.current = true;
  };
  const initial = session?.user.email?.slice(0, 1).toUpperCase();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.coachId}><View style={styles.coachAvatar}><Ionicons name="sparkles" size={16} color={colors.onPrimary} /></View><View><Text style={type.subheading}>AI Coach</Text><View style={styles.online}><View style={styles.onlineDot} /><Text style={type.caption}>Ask about any exercise</Text></View></View></View>
        <View style={styles.topActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Start new chat" onPress={onNewChat} style={({ pressed }) => [styles.newChat, pressed && { backgroundColor: colors.surfaceRaised }]}><Ionicons name="create-outline" size={16} color={colors.text} /><Text style={styles.newChatText}>New chat</Text></Pressable>
          <View style={styles.avatar}>{initial ? <Text style={styles.avatarText}>{initial}</Text> : <Ionicons name="person-outline" size={16} color={colors.textSecondary} />}</View>
        </View>
      </View>
      <FlatList ref={list} data={messages} keyExtractor={item => String(item.id)} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled" initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3}
        onViewableItemsChanged={viewability} onScroll={event => { const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent; atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 120; }} scrollEventThrottle={100}
        onContentSizeChange={() => { if (atBottom.current) list.current?.scrollToEnd({ animated: true }); }}
        ListHeaderComponent={messages.length === 0 ? <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="sparkles" size={26} color={colors.primary} /></View>
          <View style={{ gap: 6, alignItems: 'center' }}><Text style={[type.title, { textAlign: 'center' }]}>What would you like to train?</Text><Text style={[type.body, { textAlign: 'center' }]}>Ask for an exercise by name and I’ll show its demonstration and instructions.</Text></View>
          <View style={styles.suggestions}><Text style={type.overline}>Try asking</Text>{suggestions.map(item => <Pressable key={item} onPress={() => setPrompt(item)} style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.surfaceRaised }]}><Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.muted} /><Text style={styles.suggestionText}>{item}</Text><Ionicons name="arrow-up-outline" size={16} color={colors.muted} style={{ transform: [{ rotate: '45deg' }] }} /></Pressable>)}</View>
          <Notice title="Exercise demonstrations">Stored GIFs and illustrations, with video tutorials as a backup. Messages are sent to our AI provider; chat clears when you change accounts or restart the app.</Notice>
        </View> : undefined}
        renderItem={({ item: message }) => <View style={{ gap: 14 }}>
          <View style={styles.userBubble}><Text style={styles.userText}>{message.prompt}</Text></View>
          <View style={styles.reply}>
            <View style={styles.replyAvatar}><Ionicons name="sparkles" size={12} color={colors.primary} /></View>
            <View style={styles.replyBody}>
              <Text accessibilityLiveRegion="polite" style={styles.replyText}>{message.text.replace(/\*\*/g, '')}</Text>
              {message.programId === 'beginner-strength' && <ProgramRecommendation />}
              {message.programId === 'custom-plan' && <PlanBuilderCard compact />}
              {message.exercise && <Card style={{ gap: 12 }}>
                <View style={{ gap: 6 }}><Text style={type.heading}>{message.exercise.name}</Text><View style={styles.tags}><Tag label={message.exercise.muscle} tone="primary" /><Tag label={message.exercise.equipment} /><Tag label={message.exercise.difficulty} /></View></View>
                <MediaSlot active={visible.includes(message.id)}><ExerciseDemonstration key={message.exercise.id} exercise={message.exercise} /></MediaSlot>
                <View style={{ gap: 10 }}>{message.exercise.instructions.map((instruction, index) => <View key={instruction} style={styles.step}><Text style={styles.stepNumber}>{index + 1}</Text><Text style={[type.small, { flex: 1 }]}>{instruction}</Text></View>)}</View>
                {message.exercise.reviewStatus === 'draft' && <Text style={type.caption}>Draft exercise entry · Content review pending</Text>}
              </Card>}
              {!!message.relatedExercises?.length && <View style={{ gap: 8 }}>
                <Text style={type.overline}>{message.exercise ? 'Also try' : 'Exercises in this answer'} · tap for a demo</Text>
                {message.relatedExercises.map(exercise => <ExerciseRow key={exercise.id} exercise={exercise} />)}
              </View>}
              {(message.relatedExercises?.length ?? 0) >= 3 && message.programId !== 'custom-plan' && <Pressable accessibilityRole="button" onPress={() => router.push('/plan-builder')} style={({ pressed }) => [styles.planCta, pressed && { opacity: 0.85 }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}><Text style={type.subheading}>Turn this into a 4-week plan</Text><Text style={type.caption}>Personalized to your schedule · unlock with PayPal</Text></View>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </Pressable>}
              {message.id === messages[messages.length - 1]?.id && !loading && !!message.followUps?.length && <View style={styles.followUps}>
                {message.followUps.map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Ask: ${item}`} onPress={() => { atBottom.current = true; void send(item); }} style={({ pressed }) => [styles.followUp, pressed && { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={styles.followUpText}>{item}</Text>
                </Pressable>)}
              </View>}
              {!message.exercise && !message.relatedExercises?.length && message.youtubeQuery ? <MediaSlot active={visible.includes(message.id)}><ExerciseMediaFallback query={message.youtubeQuery} /></MediaSlot> : null}
            </View>
          </View>
        </View>}
        ListFooterComponent={<View style={{ gap: 12 }}>
          {loading && <><View style={styles.userBubble}><Text accessibilityLiveRegion="polite" style={styles.userText}>{pendingQuestion}</Text></View>
            <View style={styles.reply}><View style={styles.replyAvatar}><Ionicons name="sparkles" size={12} color={colors.primary} /></View><View style={styles.typing}><ActivityIndicator size="small" color={colors.muted} /><Text style={type.small}>Coach is typing…</Text></View></View></>}
          {error !== '' && <Notice tone="error" action={<Pressable accessibilityRole="button" disabled={loading} onPress={() => void send(failedQuestion.current)} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={type.link}>Retry request</Text></Pressable>}>{error}</Notice>}
          {messages.length > 0 && <Text style={[type.caption, { textAlign: 'center' }]}>Recent context: up to 12 messages. Start a new chat to reset.</Text>}
        </View>} />
        <View style={styles.composerWrap}><View style={styles.composer}><TextInput accessibilityLabel="Message the coach" value={prompt} onChangeText={setPrompt} maxLength={2000} onSubmitEditing={submit} returnKeyType="send" placeholder="Ask about an exercise…" placeholderTextColor={colors.muted} style={styles.input} multiline /><Pressable accessibilityRole="button" accessibilityLabel="Send request" disabled={loading || !prompt.trim()} onPress={submit} style={[styles.send, (loading || !prompt.trim()) && styles.sendDisabled]}><Ionicons name="arrow-up" size={18} color={colors.onPrimary} /></Pressable></View></View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  coachId: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coachAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  online: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newChat: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  newChatText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontWeight: '700' },
  screen: { gap: 24, padding: 20, paddingBottom: 24, flexGrow: 1 },
  empty: { gap: 24, alignItems: 'stretch', paddingTop: 12 },
  emptyIcon: { alignSelf: 'center', width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  suggestions: { gap: 8 },
  suggestion: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: radii.md, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface },
  suggestionText: { flex: 1, color: colors.text, fontWeight: '500', fontSize: 14 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { color: colors.onPrimary, fontSize: 15, lineHeight: 21 },
  reply: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  replyAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  replyBody: { flex: 1, gap: 14 },
  replyText: { color: colors.text, fontSize: 15, lineHeight: 23 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  planCta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  followUps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  followUp: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.surface },
  followUpText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  step: { flexDirection: 'row', gap: 10 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceRaised, color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  composerWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  composer: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 6, paddingLeft: 14 },
  input: { flex: 1, color: colors.text, fontSize: 15, maxHeight: 110, minHeight: 40, paddingVertical: 10, outlineStyle: 'none' } as never,
  send: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
});
