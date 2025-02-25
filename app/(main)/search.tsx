import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Searchbar, List, Text, Divider, Avatar, Chip, Surface } from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { supabase } from '../../src/lib/supabase';
import { useRouter, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="magnify"
          size={48}
          color={colors.TEXT.SECONDARY}
          style={{ marginBottom: 16, opacity: 0.7 }}
        />
        <Text style={{ color: colors.TEXT.SECONDARY, textAlign: 'center' }}>
          {searchQuery.length > 0
            ? 'No results found. Try a different search.'
            : 'Search for users or posts'}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    if (searchQuery.length > 0 || profiles.length > 0 || posts.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [searchQuery, profiles, posts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      <View style={styles.header}>
        <Searchbar
          ref={searchbarRef}
          placeholder="Search..."
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.length > 0) {
              handleSearch(text);
            } else {
              setProfiles([]);
              setPosts([]);
            }
          }}
          value={searchQuery}
          style={[
            styles.searchbar, 
            { 
              backgroundColor: colors.SURFACE,
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }
          ]}
          inputStyle={{ color: colors.TEXT.PRIMARY }}
          iconColor={colors.TEXT.SECONDARY}
          placeholderTextColor={colors.TEXT.SECONDARY}
          loading={isSearching}
        />
        
        <View style={styles.searchTypesContainer}>
          <TouchableOpacity
            style={[
              styles.searchTypeChip,
              searchType === 'all' && { backgroundColor: colors.TAB_BAR.ACTIVE + '30' }
            ]}
            onPress={() => setSearchType('all')}
          >
            <Text style={{ 
              color: searchType === 'all' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY,
              fontWeight: searchType === 'all' ? '600' : '400',
            }}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.searchTypeChip,
              searchType === 'users' && { backgroundColor: colors.TAB_BAR.ACTIVE + '30' }
            ]}
            onPress={() => setSearchType('users')}
          >
            <Text style={{ 
              color: searchType === 'users' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY,
              fontWeight: searchType === 'users' ? '600' : '400',
            }}>
              Users
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.searchTypeChip,
              searchType === 'posts' && { backgroundColor: colors.TAB_BAR.ACTIVE + '30' }
            ]}
            onPress={() => setSearchType('posts')}
          >
            <Text style={{ 
              color: searchType === 'posts' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY,
              fontWeight: searchType === 'posts' ? '600' : '400',
            }}>
              Posts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {profiles.length === 0 && posts.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {(searchType === 'all' || searchType === 'users') && profiles.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>Users</Text>
                  
                  {profiles.map((profile) => (
                    <Surface 
                      key={profile.id}
                      style={[
                        styles.card, 
                        { 
                          backgroundColor: colors.CARD,
                          elevation: 1,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                        }
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.userItem}
                        onPress={() => router.push(`/(main)/profile/${profile.id}`)}
                      >
                        <Avatar.Image
                          size={50}
                          source={{ uri: profile.profile_pic_url || 'https://i.pravatar.cc/150' }}
                        />
                        <View style={styles.userInfo}>
                          <Text style={[styles.userName, { color: colors.TEXT.PRIMARY }]}>
                            {profile.name || 'Anonymous'}
                          </Text>
                          <Text style={[styles.userUsername, { color: colors.TEXT.SECONDARY }]}>
                            @{profile.username || 'user'}
                          </Text>
                        </View>
                        <MaterialCommunityIcons 
                          name="chevron-right" 
                          size={24} 
                          color={colors.TEXT.SECONDARY}
                        />
                      </TouchableOpacity>
                    </Surface>
                  ))}
                </View>
              )}
              
              {(searchType === 'all' || searchType === 'posts') && posts.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.TEXT.PRIMARY }]}>Posts</Text>
                  
                  {posts.map((post) => (
                    <Surface 
                      key={post.id}
                      style={[
                        styles.card, 
                        { 
                          backgroundColor: colors.CARD,
                          elevation: 1,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                        }
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.postItem}
                        onPress={() => router.push(`/(main)/discover/${post.id}`)}
                      >
                        <View style={styles.postHeader}>
                          <View style={styles.postAuthor}>
                            <Avatar.Image
                              size={36}
                              source={{ uri: post.author_profile_pic || 'https://i.pravatar.cc/150' }}
                            />
                            <View style={styles.authorInfo}>
                              <Text style={[styles.authorName, { color: colors.TEXT.PRIMARY }]}>
                                {post.author_name || 'Anonymous'}
                              </Text>
                              <Text style={[styles.authorUsername, { color: colors.TEXT.SECONDARY }]}>
                                @{post.author_username || 'user'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <Text style={[styles.postTitle, { color: colors.TEXT.PRIMARY }]}>
                          {post.title}
                        </Text>
                        
                        <Text 
                          numberOfLines={2} 
                          style={[styles.postContent, { color: colors.TEXT.SECONDARY }]}
                        >
                          {post.content}
                        </Text>
                      </TouchableOpacity>
                    </Surface>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 2,
  },
  searchTypesContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
  },
  searchTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
  },
  postItem: {
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  authorUsername: {
    fontSize: 13,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
});