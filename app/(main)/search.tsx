import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Searchbar, List, Text, Divider, Avatar, Chip, Surface } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { supabase } from '../../src/lib/supabase';
import { useRouter, useNavigation } from 'expo-router';

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  profile_pic_url: string | null;
};

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <Chip
            selected={searchType === 'all'}
            onPress={() => setSearchType('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={searchType === 'users'}
            onPress={() => setSearchType('users')}
            style={styles.filterChip}
          >
            Users
          </Chip>
          <Chip
            selected={searchType === 'posts'}
            onPress={() => setSearchType('posts')}
            style={styles.filterChip}
          >
            Posts
          </Chip>
        </ScrollView>
      </View>

      <ScrollView style={styles.results}>
        {(searchType === 'all' || searchType === 'users') && profiles.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
              Users
            </Text>
            {profiles.map((profile) => (
              <Surface
                key={profile.id}
                style={[styles.resultCard, { backgroundColor: colors.SURFACE }]}
                elevation={1}
              >
                <List.Item
                  title={profile.name || 'Anonymous'}
                  description={`@${profile.username || 'username'}`}
                  left={() => (
                    <Avatar.Image
                      size={48}
                      source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/300' }}
                    />
                  )}
                  onPress={() => router.push(`/(main)/profile/${profile.id}`)}
                  titleStyle={{ color: colors.TEXT.PRIMARY }}
                  descriptionStyle={{ color: colors.TEXT.SECONDARY }}
                />
              </Surface>
            ))}
          </View>
        )}

        {(searchType === 'all' || searchType === 'posts') && posts.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>
              Posts
            </Text>
            {posts.map((post) => (
              <Surface
                key={post.id}
                style={[styles.resultCard, { backgroundColor: colors.SURFACE }]}
                elevation={1}
              >
                <List.Item
                  title={post.title}
                  description={post.content}
                  onPress={() => router.push(`/(main)/discover/${post.id}`)}
                  titleStyle={{ color: colors.TEXT.PRIMARY }}
                  descriptionStyle={{ color: colors.TEXT.SECONDARY }}
                  descriptionNumberOfLines={2}
                />
              </Surface>
            ))}
          </View>
        )}

        {searchQuery.length >= 2 && !isSearching && profiles.length === 0 && posts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ color: colors.TEXT.SECONDARY }}>No results found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
    marginBottom: 12,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContainer: {
    paddingRight: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  results: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  resultCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});