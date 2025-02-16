import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Searchbar, List, Text, Divider, Avatar, Chip } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { supabase } from '../../src/lib/supabase';
import { useRouter, useNavigation } from 'expo-router';

type Post = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  updated_at: string;
  author_name: string | null;
  author_username: string | null;
  author_profile_pic: string | null;
};

export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'users' | 'posts'>('all');
  const searchbarRef = React.useRef<any>(null);

  useEffect(() => {
    // Focus the search input when the screen mounts
    const unsubscribe = navigation.addListener('focus', () => {
      setTimeout(() => {
        searchbarRef.current?.focus();
      }, 100);
    });

    return unsubscribe;
  }, [navigation]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setProfiles([]);
      setPosts([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchTerm = query.toLowerCase().trim();
      console.log('Searching for:', searchTerm, 'Type:', searchType);
      
      const promises = [];

      // Search profiles if searching all or users
      if (searchType === 'all' || searchType === 'users') {
        promises.push(
          supabase
            .from('profiles')
            .select('id, username, name, profile_pic_url')
            .or(`username.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
            .limit(20)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      // Search posts if searching all or posts
      if (searchType === 'all' || searchType === 'posts') {
        promises.push(
          supabase
            .from('posts')
            .select('*')
            .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
            .limit(20)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      const [profilesResult, postsResult] = await Promise.all(promises);

      if (profilesResult.error) throw profilesResult.error;
      if (postsResult.error) throw postsResult.error;

      setProfiles(profilesResult.data || []);
      setPosts(postsResult.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setProfiles([]);
      setPosts([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchType]);

  // ... rest of the component code ...

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <View style={styles.searchHeader}>
        <Searchbar
          ref={searchbarRef}
          placeholder="Search users and posts..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.CARD }]}
          iconColor={colors.TEXT.PRIMARY}
          inputStyle={{ color: colors.TEXT.PRIMARY }}
          elevation={0}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {/* ... rest of your existing JSX ... */}
      </View>
    </View>
  );
}