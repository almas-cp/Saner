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
      // Use JOIN syntax instead of nested selects to avoid relationship errors
      const { data, error } = await supabase
        .rpc('get_professional_consultations', { 
          professional_id_param: user.id 
        });

      if (error) {
        console.error('Error fetching professional consultations:', error);
        // Try alternative query approach using plain SQL if RPC fails
        const { data: altData, error: altError } = await supabase
          .from('consultations')
          .select('*')
          .eq('professional_id', user.id)
          .order('created_at', { ascending: false });
          
        if (altError) {
          console.error('Alternative query also failed:', altError);
          throw altError;
        }
        
        if (altData) {
          // For each consultation, separately fetch the client details
          const enhancedData = [];
          for (const consult of altData) {
            const { data: clientData } = await supabase
              .from('profiles')
              .select('name, username, profile_pic_url')
              .eq('id', consult.client_id)
              .single();
              
            enhancedData.push({
              ...consult,
              client_details: clientData
            });
          }
          
          // Map to the expected format
          consultationsData = enhancedData.map(item => ({
            id: item.id,
            client_id: item.client_id,
            client_name: item.client_details?.name || 'Anonymous Client',
            client_username: item.client_details?.username || null,
            client_profile_pic: item.client_details?.profile_pic_url || null,
            status: item.status as ConsultationStatus,
            created_at: item.created_at,
            scheduled_for: item.scheduled_for || null,
            last_message: item.last_message || null,
            last_message_time: item.last_message_time || null,
            fee_paid: item.fee_paid,
            is_new: item.status === 'pending' // Mark pending consultations as new
          }));
        }
      } else if (data) {
        consultationsData = data.map(item => ({
          id: item.id,
          client_id: item.client_id,
          client_name: item.client_name || 'Anonymous Client',
          client_username: item.client_username || null,
          client_profile_pic: item.client_profile_pic || null,
          status: item.status as ConsultationStatus,
          created_at: item.created_at,
          scheduled_for: item.scheduled_for || null,
          last_message: item.last_message || null,
          last_message_time: item.last_message_time || null,
          fee_paid: item.fee_paid,
          is_new: item.status === 'pending' // Mark pending consultations as new
        }));
      }
    } else {
      // For regular users: Fetch consultations where they're the client
      // Use JOIN syntax instead of nested selects to avoid relationship errors
      const { data, error } = await supabase
        .rpc('get_client_consultations', { 
          client_id_param: user.id 
        });

      if (error) {
        console.error('Error fetching client consultations:', error);
        // Try alternative query approach using plain SQL if RPC fails
        const { data: altData, error: altError } = await supabase
          .from('consultations')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });
          
        if (altError) {
          console.error('Alternative query also failed:', altError);
          throw altError;
        }
        
        if (altData) {
          // For each consultation, separately fetch the professional details
          const enhancedData = [];
          for (const consult of altData) {
            const { data: profData } = await supabase
              .from('profiles')
              .select('name, username, profile_pic_url')
              .eq('id', consult.professional_id)
              .single();
              
            const { data: medProfData } = await supabase
              .from('medical_professionals')
              .select('title')
              .eq('id', consult.professional_id)
              .single();
              
            enhancedData.push({
              ...consult,
              professional_details: profData,
              medical_details: medProfData
            });
          }
          
          // Map to the expected format
          consultationsData = enhancedData.map(item => ({
            id: item.id,
            client_id: item.professional_id, // Use professional as the "client" for the view
            client_name: item.professional_details?.name || 'Anonymous Professional',
            client_username: item.professional_details?.username || null,
            client_profile_pic: item.professional_details?.profile_pic_url || null,
            status: item.status as ConsultationStatus,
            created_at: item.created_at,
            scheduled_for: item.scheduled_for || null,
            last_message: item.last_message || null,
            last_message_time: item.last_message_time || null,
            fee_paid: item.fee_paid,
            is_new: false // Clients initiated the consultation, so it's not new to them
          }));
        }
      } else if (data) {
        consultationsData = data.map(item => ({
          id: item.id,
          client_id: item.professional_id, // Use professional as the "client" for the view
          client_name: item.professional_name || 'Anonymous Professional',
          client_username: item.professional_username || null,
          client_profile_pic: item.professional_profile_pic || null,
          status: item.status as ConsultationStatus,
          created_at: item.created_at,
          scheduled_for: item.scheduled_for || null,
          last_message: item.last_message || null,
          last_message_time: item.last_message_time || null,
          fee_paid: item.fee_paid,
          is_new: false // Clients initiated the consultation, so it's not new to them
        }));
      }
    }

    console.log(`Found ${consultationsData.length} consultations`);
    setConsultations(consultationsData);
    setFilteredConsultations(filterConsultations(consultationsData, searchQuery, consultationStatusFilter));
  } catch (error) {
    console.error('Error fetching consultations:', error);
    
    // Fall back to sample data in development
    if (process.env.NODE_ENV === 'development') {
      setConsultations(sampleConsultations);
      setFilteredConsultations(sampleConsultations);
    }
  } finally {
    setLoading(false);
  }
}; 