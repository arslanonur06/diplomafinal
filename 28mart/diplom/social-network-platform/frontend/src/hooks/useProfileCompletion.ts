import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../utils/supabaseClient';

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfileCompletion();
  }, [user]);

  const checkProfileCompletion = async () => {
    try {
      if (!user) {
        setIsProfileComplete(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, bio, interests')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const isComplete = data && 
        data.full_name?.trim() && 
        data.bio?.trim() && 
        Array.isArray(data.interests) && 
        data.interests.length > 0;

      setIsProfileComplete(!!isComplete);
    } catch (error) {
      console.error('Error checking profile completion:', error);
      setIsProfileComplete(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isProfileComplete,
    loading,
    checkProfileCompletion
  };
};
