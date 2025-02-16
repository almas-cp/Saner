import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Searchbar, List, Text, Divider, Avatar, Chip } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { supabase } from '../../src/lib/supabase';
import { useRouter, useNavigation } from 'expo-router';

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
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
        <View style={styles.chipContainer}>
          <Chip
            selected={searchType === 'all'}
            onPress={() => setSearchType('all')}
            style={styles.chip}
          >
            All
          </Chip>
          <Chip
            selected={searchType === 'users'}
            onPress={() => setSearchType('users')}
            style={styles.chip}
          >
            Users
          </Chip>
          <Chip
            selected={searchType === 'posts'}
            onPress={() => setSearchType('posts')}
            style={styles.chip}
          >
            Posts
          </Chip>
        </View>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {/* Users Section */}
        {(searchType === 'all' || searchType === 'users') && (
          <View style={styles.section}>
            <Text 
              variant="titleMedium" 
              style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}
            >
              Users {isSearching ? '(Searching...)' : profiles.length > 0 ? `(${profiles.length})` : ''}
            </Text>
            {profiles.length > 0 ? (
              profiles.map((profile) => (
                <List.Item
                  key={profile.id}
                  title={profile.username ? `@${profile.username}` : 'No username'}
                  description={profile.name || undefined}
                  left={props => (
                    profile.profile_pic_url ? (
                      <Avatar.Image
                        size={40}
                        source={{ uri: profile.profile_pic_url }}
                      />
                    ) : (
                      <Avatar.Icon
                        size={40}
                        icon="account"
                      />
                    )
                  )}
                  onPress={() => {
                    console.log('Navigate to user:', profile.username);
                  }}
                  style={[styles.resultItem, { backgroundColor: colors.SURFACE }]}
                  titleStyle={{ color: colors.TEXT.PRIMARY }}
                  descriptionStyle={{ color: colors.TEXT.SECONDARY }}
                />
              ))
            ) : (
              searchQuery.length >= 2 && !isSearching && (
                <Text style={[styles.noResults, { color: colors.TEXT.SECONDARY }]}>
                  No users found matching "{searchQuery}"
                </Text>
              )
            )}
          </View>
        )}

        {/* Posts Section */}
        {(searchType === 'all' || searchType === 'posts') && (
          <>
            {searchType === 'all' && <Divider style={styles.divider} />}
            <View style={styles.section}>
              <Text 
                variant="titleMedium" 
                style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}
              >
                Posts {isSearching ? '(Searching...)' : posts.length > 0 ? `(${posts.length})` : ''}
              </Text>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <List.Item
                    key={post.id}
                    title={post.title}
                    description={`by ${post.author_username ? `@${post.author_username}` : post.author_name || 'Unknown'} • ${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}`}
                    left={props => (
                      post.author_profile_pic ? (
                        <Avatar.Image
                          size={40}
                          source={{ uri: post.author_profile_pic }}
                        />
                      ) : (
                        <Avatar.Icon
                          size={40}
                          icon="post"
                        />
                      )
                    )}
                    onPress={() => router.push(`/(main)/discover/${post.id}`)}
                    style={[styles.resultItem, { backgroundColor: colors.SURFACE }]}
                    titleStyle={{ color: colors.TEXT.PRIMARY }}
                    descriptionStyle={{ color: colors.TEXT.SECONDARY }}
                  />
                ))
              ) : (
                searchQuery.length >= 2 && !isSearching && (
                  <Text style={[styles.noResults, { color: colors.TEXT.SECONDARY }]}>
                    No posts found matching "{searchQuery}"
                  </Text>
                )
              )}
            </View>
          </>
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
  },
  searchBar: {
    borderRadius: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  resultsContainer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  resultItem: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  divider: {
    marginVertical: 16,
  },
  noResults: {
    textAlign: 'center',
    padding: 16,
  },
});