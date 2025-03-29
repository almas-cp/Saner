import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Pressable,
  Image,
  SafeAreaView,
  Platform
} from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  ActivityIndicator, 
  Chip, 
  Searchbar,
  Divider,
  IconButton
} from 'react-native-paper';
import { useTheme } from '../../src/contexts/theme';
import { supabase } from '../../src/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { formatDistanceToNow } from 'date-fns';
import { 
  createConsultationChat, 
  logConsultationStatus, 
  inspectConsultation 
} from '../../src/lib/chat_debug';

// Define types for medical professional data
type Specialty = 'psychiatrist' | 'psychologist' | 'therapist' | 'counselor' | 'general';
type Availability = 'available' | 'busy' | 'offline';

type MedicalProfessional = {
  id: string;
  name: string;
  title: string;
  specialty: Specialty;
  experience: number; // in years
  rating: number; // out of 5
  consultations: number;
  availability: Availability;
  profile_pic_url: string;
  bio: string;
  consultation_fee: number; // in coins
  verified: boolean;
};

// Add types for client consultations
type ConsultationStatus = 'pending' | 'active' | 'completed' | 'cancelled';

type ClientConsultation = {
  id: string;
  client_id: string;
  client_name: string;
  client_username: string | null;
  client_profile_pic: string | null;
  status: ConsultationStatus;
  created_at: string;
  scheduled_for: string | null;
  last_message: string | null;
  last_message_time: string | null;
  fee_paid: number;
  is_new: boolean;
};

// Sample data for medical professionals
const sampleProfessionals: MedicalProfessional[] = [];

// Sample data for client consultations
const sampleConsultations: ClientConsultation[] = [];

export default function Professionals() {
  const { theme, colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isProfessionalMode = params.mode === 'professional';
  
  // States for normal user view (browsing professionals)
  const [professionals, setProfessionals] = useState<MedicalProfessional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<MedicalProfessional[]>([]);
  
  // States for professional view (managing client consultations)
  const [consultations, setConsultations] = useState<ClientConsultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<ClientConsultation[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | 'all'>('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [consultationStatusFilter, setConsultationStatusFilter] = useState<ConsultationStatus | 'all'>('all');

  // Fetch professionals from the database
  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      // Get professionals from the database
      const { data: { user } } = await supabase.auth.getUser();
      
      // First get profiles that have is_doctor = true
      const { data: doctorProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, username, profile_pic_url')
        .eq('is_doctor', true);

      if (profileError) {
        console.error('Error fetching doctor profiles:', profileError);
        throw profileError;
      }

      console.log(`Found ${doctorProfiles?.length || 0} doctor profiles`);

      if (!doctorProfiles || doctorProfiles.length === 0) {
        console.log('No doctors found in profiles');
        // No fallback to sample data, just set empty arrays
        setProfessionals([]);
        setFilteredProfessionals([]);
        setLoading(false);
        return;
      }

      // Now fetch data from medical_professionals for these doctors
      const doctorIds = doctorProfiles.map(profile => profile.id);
      const { data: medicalData, error: medicalError } = await supabase
        .from('medical_professionals')
        .select('*')
        .in('id', doctorIds);

      if (medicalError) {
        console.error('Error fetching medical professional data:', medicalError);
        throw medicalError;
      }

      console.log(`Found ${medicalData?.length || 0} medical professional records`);

      // Combine the data
      const transformedData: MedicalProfessional[] = doctorProfiles.map(profile => {
        // Find corresponding medical professional data
        const professionalData = medicalData?.find(p => p.id === profile.id) || {};
        
        return {
          id: profile.id,
          name: profile.name || 'Anonymous Doctor',
          title: professionalData.title || 'Medical Professional',
          specialty: (professionalData.specialty as Specialty) || 'general',
          experience: professionalData.experience_years || 0,
          rating: 4.5, // Default rating
          consultations: 0, // Default value
          availability: professionalData.available ? 'available' : 'offline',
          profile_pic_url: profile.profile_pic_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
          bio: professionalData.bio || 'No bio available',
          consultation_fee: professionalData.consultation_fee || 15,
          verified: professionalData.verified || false
        };
      });

      console.log(`Displaying ${transformedData.length} medical professionals`);

      // Set the actual data from the database
      setProfessionals(transformedData);
      setFilteredProfessionals(filterProfessionals(transformedData, searchQuery, selectedSpecialty, showOnlyAvailable));
    } catch (error) {
      console.error('Error fetching medical professionals:', error);
      
      // No fallback to sample data, just set empty arrays
      setProfessionals([]);
      setFilteredProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter professionals based on search query and filters
  const filterProfessionals = (
    professionalsData: MedicalProfessional[], 
    query: string, 
    specialty: Specialty | 'all', 
    onlyAvailable: boolean
  ) => {
    let filtered = professionalsData;

    // Filter by search query
    if (query) {
      filtered = filtered.filter(pro => 
        pro.name.toLowerCase().includes(query.toLowerCase()) ||
        pro.title.toLowerCase().includes(query.toLowerCase()) ||
        pro.bio.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filter by specialty
    if (specialty !== 'all') {
      filtered = filtered.filter(pro => pro.specialty === specialty);
    }

    // Filter by availability
    if (onlyAvailable) {
      filtered = filtered.filter(pro => pro.availability === 'available');
    }

    return filtered;
  };

  // Handle search
  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    setFilteredProfessionals(filterProfessionals(professionals, query, selectedSpecialty, showOnlyAvailable));
  };

  // Handle specialty filter
  const handleSpecialtyFilter = (specialty: Specialty | 'all') => {
    setSelectedSpecialty(specialty);
    setFilteredProfessionals(filterProfessionals(professionals, searchQuery, specialty, showOnlyAvailable));
  };

  // Handle availability filter
  const toggleAvailabilityFilter = () => {
    const newValue = !showOnlyAvailable;
    setShowOnlyAvailable(newValue);
    setFilteredProfessionals(filterProfessionals(professionals, searchQuery, selectedSpecialty, newValue));
  };

  // Fetch client consultations
  const fetchConsultations = async () => {
    setLoading(true);
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }

      // Check if the user is a medical professional
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_doctor')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      let consultationsData: ClientConsultation[] = [];

      if (profile?.is_doctor) {
        // For doctors: Fetch consultations where they're the professional
        const { data, error } = await supabase
          .from('consultations')
          .select(`
            id,
            client_id,
            status,
            created_at,
            scheduled_for,
            last_message,
            last_message_time,
            fee_paid,
            profiles:client_id(name, username, profile_pic_url)
          `)
          .eq('professional_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching professional consultations:', error);
          throw error;
        }

        if (data) {
          consultationsData = data.map(item => {
            // Safely access nested profile data
            const clientProfile = item.profiles as { name?: string; username?: string; profile_pic_url?: string } | null;
            
            return {
              id: item.id,
              client_id: item.client_id,
              client_name: clientProfile?.name || 'Anonymous Client',
              client_username: clientProfile?.username || null,
              client_profile_pic: clientProfile?.profile_pic_url || null,
              status: item.status as ConsultationStatus,
              created_at: item.created_at,
              scheduled_for: item.scheduled_for || null,
              last_message: item.last_message || null,
              last_message_time: item.last_message_time || null,
              fee_paid: item.fee_paid,
              is_new: item.status === 'pending' // Mark pending consultations as new
            };
          });
        }
      } else {
        // For regular users: Fetch consultations where they're the client
        const { data, error } = await supabase
          .from('consultations')
          .select(`
            id,
            professional_id,
            status,
            created_at,
            scheduled_for,
            last_message,
            last_message_time,
            fee_paid,
            medical_professionals:professional_id(title),
            profiles:professional_id(name, username, profile_pic_url)
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching client consultations:', error);
          throw error;
        }

        if (data) {
          consultationsData = data.map(item => {
            // Safely access nested profile data
            const professionalProfile = item.profiles as { name?: string; username?: string; profile_pic_url?: string } | null;
            
            return {
              id: item.id,
              client_id: item.professional_id, // Use professional as the "client" for the view
              client_name: professionalProfile?.name || 'Anonymous Professional',
              client_username: professionalProfile?.username || null,
              client_profile_pic: professionalProfile?.profile_pic_url || null,
              status: item.status as ConsultationStatus,
              created_at: item.created_at,
              scheduled_for: item.scheduled_for || null,
              last_message: item.last_message || null,
              last_message_time: item.last_message_time || null,
              fee_paid: item.fee_paid,
              is_new: false // Clients initiated the consultation, so it's not new to them
            };
          });
        }
      }

      console.log(`Found ${consultationsData.length} consultations`);
      setConsultations(consultationsData);
      setFilteredConsultations(filterConsultations(consultationsData, searchQuery, consultationStatusFilter));
    } catch (error) {
      console.error('Error fetching consultations:', error);
      
      // No fallback to sample data, just set empty arrays
      setConsultations([]);
      setFilteredConsultations([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter consultations based on search query and status
  const filterConsultations = (
    consultationsData: ClientConsultation[],
    query: string,
    status: ConsultationStatus | 'all'
  ) => {
    let filtered = consultationsData;

    // Filter by search query
    if (query) {
      filtered = filtered.filter(consult => 
        consult.client_name.toLowerCase().includes(query.toLowerCase()) ||
        (consult.client_username && consult.client_username.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(consult => consult.status === status);
    }

    return filtered;
  };

  // Handle status filter
  const handleStatusFilter = (status: ConsultationStatus | 'all') => {
    setConsultationStatusFilter(status);
    setFilteredConsultations(filterConsultations(consultations, searchQuery, status));
  };

  // Handle consultation search
  const onChangeConsultationSearch = (query: string) => {
    setSearchQuery(query);
    setFilteredConsultations(filterConsultations(consultations, query, consultationStatusFilter));
  };

  // Get color for availability badge
  const getAvailabilityColor = (availability: Availability) => {
    switch (availability) {
      case 'available':
        return '#4CAF50';
      case 'busy':
        return '#FFA000';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  // Get text for availability
  const getAvailabilityText = (availability: Availability) => {
    switch (availability) {
      case 'available':
        return 'Available Now';
      case 'busy':
        return 'In Session';
      case 'offline':
        return 'Offline';
      default:
        return 'Unavailable';
    }
  };

  // Get color for consultation status
  const getStatusColor = (status: ConsultationStatus) => {
    switch (status) {
      case 'pending':
        return '#FFA000'; // Amber
      case 'active':
        return '#4CAF50'; // Green
      case 'completed':
        return '#2196F3'; // Blue
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Get text for consultation status
  const getStatusText = (status: ConsultationStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Consultation action
  const requestConsultation = async (professional: MedicalProfessional) => {
    try {
      // Check if the user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to request a consultation');
        return;
      }

      // Check if there's already an active or pending consultation with this professional
      const { data: existingConsultation, error: checkError } = await supabase
        .from('consultations')
        .select('*')
        .eq('client_id', user.id)
        .eq('professional_id', professional.id)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing consultations:', checkError);
        alert('Unable to verify consultation status. Please try again later.');
        return;
      }

      if (existingConsultation) {
        alert(`You already have a ${existingConsultation.status} consultation with ${professional.name}. Please check your consultations tab.`);
        return;
      }

      // Check if the user has enough coins
      const { data: coinData, error: coinError } = await supabase
        .from('user_coins')
        .select('coins')
        .eq('user_id', user.id)
        .single();

      if (coinError) {
        console.error('Error checking coin balance:', coinError);
        alert('Unable to verify your coin balance. Please try again later.');
        return;
      }

      const userCoins = coinData?.coins || 0;
      if (userCoins < professional.consultation_fee) {
        alert(`You don't have enough coins for this consultation. You need ${professional.consultation_fee} coins, but you only have ${userCoins}.`);
        return;
      }

      // Deduct coins from the user
      const { error: updateError } = await supabase
        .from('user_coins')
        .update({
          coins: userCoins - professional.consultation_fee,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating coin balance:', updateError);
        alert('Failed to process payment. Please try again later.');
        return;
      }

      // Insert consultation request
      const { error: consultError } = await supabase
        .from('consultations')
        .insert({
          client_id: user.id,
          professional_id: professional.id,
          status: 'pending',
          fee_paid: professional.consultation_fee,
          created_at: new Date().toISOString()
        });

      if (consultError) {
        console.error('Error creating consultation request:', consultError);
        
        // If there's an error, refund the coins
        await supabase
          .from('user_coins')
          .update({
            coins: userCoins,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        alert('Failed to create consultation request. Your coins have been refunded.');
        return;
      }

      // Success message
      alert(`Consultation request sent to ${professional.name}. They will respond shortly.`);
    } catch (error) {
      console.error('Error requesting consultation:', error);
      alert('An error occurred while requesting the consultation. Please try again later.');
    }
  };

  // Toast notification helper
  const showToast = (message: string) => {
    alert(message); // Simple implementation using alert, can be replaced with a more sophisticated toast library
  };

  // Accept or decline consultation request with enhanced error handling and logging
  const handleConsultationRequest = async (consultationId: string, action: 'accept' | 'reject') => {
    try {
      console.log(`${action === 'accept' ? 'Accepting' : 'Rejecting'} consultation request: ${consultationId}`);
      
      // Check if the user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        showToast('You must be logged in to perform this action');
        return;
      }
      
      // Get consultation details
      const { data: consultation, error: consultError } = await supabase
        .from('consultations')
        .select('client_id, professional_id, fee_paid')
        .eq('id', consultationId)
        .single();
        
      if (consultError || !consultation) {
        console.error('Error fetching consultation details:', consultError);
        showToast('Unable to process request');
        return;
      }
      
      console.log(`Consultation ${consultationId} details:`, consultation);
      
      // Verify the user is the professional for this consultation
      if (consultation.professional_id !== user.id) {
        console.error('User is not the professional for this consultation');
        showToast('You are not authorized to perform this action');
        return;
      }
      
      // Update the consultation status
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ status: action === 'accept' ? 'active' : 'rejected' })
        .eq('id', consultationId);
        
      if (updateError) {
        console.error('Error updating consultation status:', updateError);
        showToast('Failed to update consultation status');
        return;
      }
      
      console.log(`✅ Successfully updated consultation ${consultationId} status to ${action === 'accept' ? 'active' : 'rejected'}`);
      
      // If accepted, create a chat room and send initial message
      if (action === 'accept') {
        // Debug the consultation first
        inspectConsultation(consultationId);
        
        // Get user profiles for names
        const { data: clientProfile, error: clientError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', consultation.client_id)
          .single();
          
        const { data: professionalProfile, error: profError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
          
        if (clientError || profError || !clientProfile || !professionalProfile) {
          console.error('Error fetching user profiles:', clientError || profError);
          showToast('Created consultation but couldn\'t create chat room');
          return;
        }
        
        // UPDATED: Use the create_unique_consultation_chat function
        // This ensures each consultation gets a unique chat ID
        const { data: chatResult, error: chatError } = await supabase.rpc(
          'create_unique_consultation_chat',
          {
            p_consultation_id: consultationId,
            p_client_id: consultation.client_id,
            p_professional_id: user.id,
            p_client_name: clientProfile.name || 'Client',
            p_professional_name: professionalProfile.name || 'Doctor'
          }
        );
        
        if (chatError) {
          console.error('Error creating chat:', chatError);
          showToast('Consultation accepted but failed to create chat room');
        } else {
          console.log('Chat creation result:', chatResult);
          showToast('Consultation accepted and chat room created');
        }
        
        // Diagnostic logging after processing
        logConsultationStatus();
      } else {
        showToast('Consultation request rejected');
      }
      
      // Refresh consultations list
      fetchConsultations();
    } catch (error) {
      console.error('Error in handleConsultationRequest:', error);
      showToast('An error occurred');
    }
  };

  // Start a chat with client
  const startClientChat = (consultation: ClientConsultation) => {
    // In a real app, this would navigate to a chat screen with this client
    console.log(`Starting chat with ${consultation.client_name}`);
    alert(`Chat with ${consultation.client_name} would open here.`);
  };

  useEffect(() => {
    // Load appropriate data based on user role
    if (isProfessionalMode) {
      fetchConsultations();
    } else {
      fetchProfessionals();
    }
  }, [isProfessionalMode]);

  // Handle refresh based on mode
  const onRefresh = async () => {
    setRefreshing(true);
    if (isProfessionalMode) {
      await fetchConsultations();
    } else {
      await fetchProfessionals();
    }
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={colors.TEXT.PRIMARY}
            style={styles.backButton}
            onPress={() => router.back()}
          />
          <Title style={[styles.headerTitle, { color: colors.TEXT.PRIMARY }]}>
            {isProfessionalMode ? 'Client Consultations' : 'Medical Professionals'}
          </Title>
        </View>
        
        {isProfessionalMode ? (
          // Professional mode view - Search and filter clients
          <>
            <Searchbar
              placeholder="Search clients by name"
              onChangeText={onChangeConsultationSearch}
              value={searchQuery}
              style={[styles.searchBar, { backgroundColor: colors.SURFACE }]}
              inputStyle={{ color: colors.TEXT.PRIMARY }}
              iconColor={colors.TEXT.SECONDARY}
              placeholderTextColor={colors.TEXT.SECONDARY}
            />

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              <Chip
                selected={consultationStatusFilter === 'all'}
                onPress={() => handleStatusFilter('all')}
                style={[
                  styles.filterChip,
                  consultationStatusFilter === 'all' ? { backgroundColor: colors.TAB_BAR.ACTIVE + '20' } : null
                ]}
                textStyle={{ 
                  color: consultationStatusFilter === 'all' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY 
                }}
              >
                All
              </Chip>
              <Chip
                selected={consultationStatusFilter === 'pending'}
                onPress={() => handleStatusFilter('pending')}
                style={[
                  styles.filterChip,
                  consultationStatusFilter === 'pending' ? { backgroundColor: getStatusColor('pending') + '20' } : null
                ]}
                textStyle={{ 
                  color: consultationStatusFilter === 'pending' ? getStatusColor('pending') : colors.TEXT.SECONDARY 
                }}
              >
                Pending
              </Chip>
              <Chip
                selected={consultationStatusFilter === 'active'}
                onPress={() => handleStatusFilter('active')}
                style={[
                  styles.filterChip,
                  consultationStatusFilter === 'active' ? { backgroundColor: getStatusColor('active') + '20' } : null
                ]}
                textStyle={{ 
                  color: consultationStatusFilter === 'active' ? getStatusColor('active') : colors.TEXT.SECONDARY 
                }}
              >
                Active
              </Chip>
              <Chip
                selected={consultationStatusFilter === 'completed'}
                onPress={() => handleStatusFilter('completed')}
                style={[
                  styles.filterChip,
                  consultationStatusFilter === 'completed' ? { backgroundColor: getStatusColor('completed') + '20' } : null
                ]}
                textStyle={{ 
                  color: consultationStatusFilter === 'completed' ? getStatusColor('completed') : colors.TEXT.SECONDARY 
                }}
              >
                Completed
              </Chip>
            </ScrollView>
          </>
        ) : (
          // Normal user mode - Search and filter professionals
          <>
            <Searchbar
              placeholder="Search professionals by name or specialty"
              onChangeText={onChangeSearch}
              value={searchQuery}
              style={[styles.searchBar, { backgroundColor: colors.SURFACE }]}
              inputStyle={{ color: colors.TEXT.PRIMARY }}
              iconColor={colors.TEXT.SECONDARY}
              placeholderTextColor={colors.TEXT.SECONDARY}
            />

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              <Chip
                selected={selectedSpecialty === 'all'}
                onPress={() => handleSpecialtyFilter('all')}
                style={[
                  styles.filterChip,
                  selectedSpecialty === 'all' ? { backgroundColor: colors.TAB_BAR.ACTIVE + '20' } : null
                ]}
                textStyle={{ 
                  color: selectedSpecialty === 'all' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY 
                }}
              >
                All
              </Chip>
              <Chip
                selected={selectedSpecialty === 'psychiatrist'}
                onPress={() => handleSpecialtyFilter('psychiatrist')}
                style={[
                  styles.filterChip,
                  selectedSpecialty === 'psychiatrist' ? { backgroundColor: colors.TAB_BAR.ACTIVE + '20' } : null
                ]}
                textStyle={{ 
                  color: selectedSpecialty === 'psychiatrist' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY 
                }}
              >
                Psychiatrists
              </Chip>
              <Chip
                selected={selectedSpecialty === 'psychologist'}
                onPress={() => handleSpecialtyFilter('psychologist')}
                style={[
                  styles.filterChip,
                  selectedSpecialty === 'psychologist' ? { backgroundColor: colors.TAB_BAR.ACTIVE + '20' } : null
                ]}
                textStyle={{ 
                  color: selectedSpecialty === 'psychologist' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY 
                }}
              >
                Psychologists
              </Chip>
              <Chip
                selected={selectedSpecialty === 'therapist'}
                onPress={() => handleSpecialtyFilter('therapist')}
                style={[
                  styles.filterChip,
                  selectedSpecialty === 'therapist' ? { backgroundColor: colors.TAB_BAR.ACTIVE + '20' } : null
                ]}
                textStyle={{ 
                  color: selectedSpecialty === 'therapist' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY 
                }}
              >
                Therapists
              </Chip>
              <Chip
                selected={selectedSpecialty === 'counselor'}
                onPress={() => handleSpecialtyFilter('counselor')}
                style={[
                  styles.filterChip,
                  selectedSpecialty === 'counselor' ? { backgroundColor: colors.TAB_BAR.ACTIVE + '20' } : null
                ]}
                textStyle={{ 
                  color: selectedSpecialty === 'counselor' ? colors.TAB_BAR.ACTIVE : colors.TEXT.SECONDARY 
                }}
              >
                Counselors
              </Chip>
            </ScrollView>
            
            <View style={styles.availabilityFilter}>
              <Chip
                selected={showOnlyAvailable}
                onPress={toggleAvailabilityFilter}
                style={[
                  styles.availabilityChip,
                  showOnlyAvailable ? { backgroundColor: '#4CAF50' + '20' } : null
                ]}
                textStyle={{ 
                  color: showOnlyAvailable ? '#4CAF50' : colors.TEXT.SECONDARY 
                }}
                icon={showOnlyAvailable ? "check-circle" : "circle-outline"}
              >
                Available Now
              </Chip>
            </View>
          </>
        )}
      </View>
      
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.TAB_BAR.ACTIVE]}
            tintColor={colors.TAB_BAR.ACTIVE}
          />
        }
      >
        <View style={styles.container}>
          {isProfessionalMode ? (
            // Professional view - Client consultations
            loading && filteredConsultations.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
                <Text style={[styles.loadingText, { color: colors.TEXT.SECONDARY }]}>
                  Loading consultations...
                </Text>
              </View>
            ) : filteredConsultations.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={64}
                  color={colors.TEXT.SECONDARY}
                  style={{ opacity: 0.5, marginBottom: 16 }}
                />
                <Text style={[styles.emptyStateText, { color: colors.TEXT.SECONDARY }]}>
                  No consultations match your search criteria.
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSearchQuery('');
                    setConsultationStatusFilter('all');
                    fetchConsultations();
                  }}
                  style={{ marginTop: 16 }}
                >
                  Reset Filters
                </Button>
              </View>
            ) : (
              filteredConsultations.map((consultation, index) => (
                <MotiView
                  key={consultation.id}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: index * 100 }}
                >
                  <Card 
                    style={[styles.consultationCard, { backgroundColor: colors.SURFACE }]}
                  >
                    <View style={[
                      { 
                        borderLeftWidth: 4,
                        borderLeftColor: getStatusColor(consultation.status),
                        borderRadius: 12, 
                        overflow: 'hidden'
                      },
                      consultation.is_new && styles.newConsultationCard
                    ]}>
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <View style={styles.profileSection}>
                            <Image 
                              source={{ uri: consultation.client_profile_pic || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
                              style={styles.profileImage} 
                            />
                            <View style={styles.nameSection}>
                              <View style={styles.nameRow}>
                                <Text style={[styles.clientName, { color: colors.TEXT.PRIMARY }]}>
                                  {consultation.client_name}
                                </Text>
                                {consultation.is_new && (
                                  <Chip 
                                    style={styles.newChip}
                                    textStyle={{ color: 'white', fontSize: 10 }}
                                  >
                                    New
                                  </Chip>
                                )}
                              </View>
                              {consultation.client_username && (
                                <Text style={[styles.clientUsername, { color: colors.TEXT.SECONDARY }]}>
                                  @{consultation.client_username}
                                </Text>
                              )}
                            </View>
                          </View>
                          <Chip
                            style={[
                              styles.statusBadge,
                              { backgroundColor: getStatusColor(consultation.status) + '20' }
                            ]}
                            textStyle={{ color: getStatusColor(consultation.status) }}
                          >
                            {getStatusText(consultation.status)}
                          </Chip>
                        </View>
                        
                        <View style={styles.consultationDetails}>
                          <View style={styles.detailRow}>
                            <MaterialCommunityIcons 
                              name="clock-outline" 
                              size={16} 
                              color={colors.TEXT.SECONDARY} 
                            />
                            <Text style={[styles.detailText, { color: colors.TEXT.SECONDARY }]}>
                              Requested {formatDistanceToNow(new Date(consultation.created_at), { addSuffix: true })}
                            </Text>
                          </View>
                          
                          {consultation.scheduled_for && (
                            <View style={styles.detailRow}>
                              <MaterialCommunityIcons 
                                name="calendar"
                                size={16} 
                                color={colors.TEXT.SECONDARY} 
                              />
                              <Text style={[styles.detailText, { color: colors.TEXT.SECONDARY }]}>
                                Scheduled for {new Date(consultation.scheduled_for).toLocaleString()}
                              </Text>
                            </View>
                          )}
                          
                          <View style={styles.detailRow}>
                            <MaterialCommunityIcons 
                              name="currency-usd" 
                              size={16} 
                              color={colors.TEXT.SECONDARY} 
                            />
                            <Text style={[styles.detailText, { color: colors.TEXT.SECONDARY }]}>
                              Fee: {consultation.fee_paid} coins
                            </Text>
                          </View>
                        </View>
                        
                        {consultation.last_message && (
                          <View style={styles.messagePreview}>
                            <Text style={[styles.messageText, { color: colors.TEXT.SECONDARY }]} numberOfLines={2}>
                              "{consultation.last_message}"
                            </Text>
                            {consultation.last_message_time && (
                              <Text style={[styles.messageTime, { color: colors.TEXT.SECONDARY }]}>
                                {formatDistanceToNow(new Date(consultation.last_message_time), { addSuffix: true })}
                              </Text>
                            )}
                          </View>
                        )}
                        
                        <View style={styles.actionRow}>
                          {consultation.status === 'pending' ? (
                            // Actions for pending consultations
                            <>
                              <Button
                                mode="contained"
                                onPress={() => handleConsultationRequest(consultation.id, 'accept')}
                                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                                labelStyle={{ color: 'white', fontSize: 12 }}
                              >
                                Accept
                              </Button>
                              <Button
                                mode="outlined"
                                onPress={() => handleConsultationRequest(consultation.id, 'reject')}
                                style={[styles.actionButton, { borderColor: '#F44336' }]}
                                textColor="#F44336"
                                labelStyle={{ fontSize: 12 }}
                              >
                                Decline
                              </Button>
                            </>
                          ) : consultation.status === 'active' ? (
                            // Actions for active consultations
                            <Button
                              mode="contained"
                              onPress={() => startClientChat(consultation)}
                              style={[styles.chatButton, { backgroundColor: colors.TAB_BAR.ACTIVE }]}
                              labelStyle={{ color: 'white' }}
                              icon="chat"
                            >
                              Continue Chat
                            </Button>
                          ) : (
                            // Actions for completed/cancelled consultations
                            <Button
                              mode="outlined"
                              onPress={() => startClientChat(consultation)}
                              style={styles.chatButton}
                              icon="history"
                            >
                              View History
                            </Button>
                          )}
                        </View>
                      </Card.Content>
                    </View>
                  </Card>
                </MotiView>
              ))
            )
          ) : (
            // Normal user view - Medical professionals list
            loading && filteredProfessionals.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.TAB_BAR.ACTIVE} />
                <Text style={[styles.loadingText, { color: colors.TEXT.SECONDARY }]}>
                  Loading professionals...
                </Text>
              </View>
            ) : filteredProfessionals.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="doctor"
                  size={64}
                  color={colors.TEXT.SECONDARY}
                  style={{ opacity: 0.5, marginBottom: 16 }}
                />
                <Text style={[styles.emptyStateText, { color: colors.TEXT.SECONDARY }]}>
                  No medical professionals found that match your search.
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedSpecialty('all');
                    setShowOnlyAvailable(false);
                    fetchProfessionals();
                  }}
                  style={{ marginTop: 16 }}
                >
                  Reset Filters
                </Button>
              </View>
            ) : (
              filteredProfessionals.map((professional, index) => (
                <MotiView
                  key={professional.id}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: index * 100 }}
                >
                  <Card 
                    style={[styles.professionalCard, { backgroundColor: colors.SURFACE }]}
                    onPress={() => {
                      // Future: Navigate to professional's detailed profile
                      console.log(`Viewing ${professional.name}'s profile`);
                    }}
                  >
                    <View style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <View style={styles.profileSection}>
                            <Image 
                              source={{ uri: professional.profile_pic_url }} 
                              style={styles.profileImage} 
                            />
                            <View style={styles.nameSection}>
                              <View style={styles.nameRow}>
                                <Text style={[styles.professionalName, { color: colors.TEXT.PRIMARY }]}>
                                  {professional.name}
                                </Text>
                                {professional.verified && (
                                  <MaterialCommunityIcons 
                                    name="check-decagram" 
                                    size={18} 
                                    color="#1DA1F2" 
                                    style={{ marginLeft: 6 }} 
                                  />
                                )}
                              </View>
                              <Text style={[styles.professionalTitle, { color: colors.TEXT.SECONDARY }]}>
                                {professional.title}
                              </Text>
                            </View>
                          </View>
                          <Chip
                            style={[
                              styles.availabilityBadge,
                              { backgroundColor: getAvailabilityColor(professional.availability) + '20' }
                            ]}
                            textStyle={{ color: getAvailabilityColor(professional.availability) }}
                          >
                            {getAvailabilityText(professional.availability)}
                          </Chip>
                        </View>
                        
                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <MaterialCommunityIcons name="star" size={16} color="#FFC107" />
                            <Text style={[styles.statValue, { color: colors.TEXT.PRIMARY }]}>
                              {professional.rating}
                            </Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statItem}>
                            <MaterialCommunityIcons name="calendar-check" size={16} color={colors.TEXT.SECONDARY} />
                            <Text style={[styles.statValue, { color: colors.TEXT.PRIMARY }]}>
                              {professional.consultations} sessions
                            </Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statItem}>
                            <MaterialCommunityIcons name="briefcase" size={16} color={colors.TEXT.SECONDARY} />
                            <Text style={[styles.statValue, { color: colors.TEXT.PRIMARY }]}>
                              {professional.experience} years
                            </Text>
                          </View>
                        </View>
                        
                        <Paragraph style={[styles.bio, { color: colors.TEXT.SECONDARY }]}>
                          {professional.bio}
                        </Paragraph>
                        
                        <View style={styles.consultationRow}>
                          <View style={styles.feeContainer}>
                            <Text style={[styles.feeLabel, { color: colors.TEXT.SECONDARY }]}>
                              Consultation fee:
                            </Text>
                            <View style={styles.feeValue}>
                              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.TEXT.PRIMARY }}>
                                {professional.consultation_fee}
                              </Text>
                              <Text style={{ fontSize: 14, color: colors.TEXT.SECONDARY, marginLeft: 4 }}>
                                coins
                              </Text>
                              <Text style={{ fontSize: 14, color: "#FFD700", marginLeft: 4 }}>
                                💰
                              </Text>
                            </View>
                          </View>
                          <Button
                            mode="contained"
                            disabled={professional.availability !== 'available'}
                            onPress={() => requestConsultation(professional)}
                            style={[
                              styles.consultButton,
                              { 
                                backgroundColor: professional.availability === 'available' 
                                  ? '#4CAF50' 
                                  : colors.TEXT.DISABLED
                              }
                            ]}
                            labelStyle={{ color: 'white' }}
                          >
                            Consult Now
                          </Button>
                        </View>
                      </Card.Content>
                    </View>
                  </Card>
                </MotiView>
              ))
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    marginRight: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 1,
    borderRadius: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  filterChip: {
    marginRight: 8,
    borderRadius: 20,
  },
  availabilityFilter: {
    marginBottom: 8,
  },
  availabilityChip: {
    borderRadius: 20,
  },
  professionalCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  professionalName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  professionalTitle: {
    fontSize: 14,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    marginLeft: 6,
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  bio: {
    marginBottom: 16,
    lineHeight: 20,
  },
  consultationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeContainer: {
    marginRight: 8,
  },
  feeLabel: {
    fontSize: 12,
  },
  feeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultButton: {
    paddingHorizontal: 12,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  consultationCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  newConsultationCard: {
    borderWidth: 1,
    borderColor: '#FFA000',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientUsername: {
    fontSize: 14,
  },
  newChip: {
    backgroundColor: '#FFA000',
    height: 20,
    marginLeft: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
  },
  consultationDetails: {
    marginTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  messagePreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    fontStyle: 'italic',
    fontSize: 14,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 8,
  },
  chatButton: {
    marginLeft: 'auto',
  },
}); 