import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/theme';
import { getCommonStyles } from '../../src/styles/commonStyles';
import { Link, useRouter } from 'expo-router';

export default function Information() {
  const { theme, colors, palette } = useTheme();
  const commonStyles = getCommonStyles(theme, palette);
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <View style={styles.headerContainer}>
        <Text style={[commonStyles.heading, styles.title]}>Database Setup</Text>
        <Text style={[commonStyles.body, { color: colors.TEXT.SECONDARY }]}>
          Follow these instructions to set up your database tables
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        <Card style={[styles.card, { backgroundColor: colors.CARD }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons 
                name="database" 
                size={24} 
                color={colors.TAB_BAR.ACTIVE} 
              />
              <Text style={[commonStyles.subheading, styles.cardTitle]}>
                Breath Tables Setup
              </Text>
            </View>
            
            <Text style={[commonStyles.body, styles.instructions]}>
              To enable the breathing exercises and mood tracking functionality, you need to run the
              included SQL script to create the necessary database tables in your Supabase project.
            </Text>
            
            <Text style={[commonStyles.subheading, { marginTop: 20, marginBottom: 10 }]}>Instructions:</Text>
            
            <View style={styles.stepContainer}>
              <View style={[styles.stepNumber, { backgroundColor: colors.TAB_BAR.ACTIVE }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[commonStyles.body, styles.stepText]}>
                Log in to your Supabase dashboard at{' '}
                <Text 
                  style={styles.link}
                  onPress={() => Linking.openURL('https://app.supabase.com')}
                >
                  https://app.supabase.com
                </Text>
              </Text>
            </View>
            
            <View style={styles.stepContainer}>
              <View style={[styles.stepNumber, { backgroundColor: colors.TAB_BAR.ACTIVE }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[commonStyles.body, styles.stepText]}>
                Open your project and navigate to the SQL Editor
              </Text>
            </View>
            
            <View style={styles.stepContainer}>
              <View style={[styles.stepNumber, { backgroundColor: colors.TAB_BAR.ACTIVE }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[commonStyles.body, styles.stepText]}>
                Create a new query and paste the contents of the breath_tables.sql file
              </Text>
            </View>
            
            <View style={styles.stepContainer}>
              <View style={[styles.stepNumber, { backgroundColor: colors.TAB_BAR.ACTIVE }]}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={[commonStyles.body, styles.stepText]}>
                Run the query to create the required tables and security policies
              </Text>
            </View>
            
            <View style={styles.codeContainer}>
              <Text style={[styles.codeHeader, { backgroundColor: colors.SURFACE }]}>
                breath_tables.sql
              </Text>
              <ScrollView 
                horizontal 
                style={[styles.codeScrollView, { backgroundColor: colors.SURFACE }]}
                contentContainerStyle={styles.codeContent}
              >
                <Text style={[styles.codeText, { color: colors.TEXT.PRIMARY }]}>
{`-- Create breath_sessions table
CREATE TABLE IF NOT EXISTS public.breath_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_duration CHECK (duration_seconds > 0)
);

-- Add appropriate indexes
CREATE INDEX IF NOT EXISTS breath_sessions_user_id_idx ON public.breath_sessions(user_id);
CREATE INDEX IF NOT EXISTS breath_sessions_created_at_idx ON public.breath_sessions(created_at);

-- Set up RLS
ALTER TABLE public.breath_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own breath sessions"
  ON public.breath_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own breath sessions"
  ON public.breath_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create mood_entries table
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_mood_value CHECK (value >= 0 AND value <= 4),
  CONSTRAINT unique_user_daily_mood UNIQUE (user_id, date)
);

-- Add appropriate indexes
CREATE INDEX IF NOT EXISTS mood_entries_user_id_idx ON public.mood_entries(user_id);
CREATE INDEX IF NOT EXISTS mood_entries_date_idx ON public.mood_entries(date);

-- Set up RLS
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own mood entries"
  ON public.mood_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood entries"
  ON public.mood_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);`}
                </Text>
              </ScrollView>
            </View>
          </Card.Content>
          
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              onPress={() => router.push('/(main)/breath')}
              style={styles.button}
            >
              Return to Breath
            </Button>
          </Card.Actions>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    marginLeft: 8,
  },
  instructions: {
    marginVertical: 8,
    lineHeight: 22,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    lineHeight: 22,
  },
  link: {
    color: '#166bb5',
    textDecorationLine: 'underline',
  },
  codeContainer: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    padding: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  codeScrollView: {
    maxHeight: 300,
  },
  codeContent: {
    padding: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});
