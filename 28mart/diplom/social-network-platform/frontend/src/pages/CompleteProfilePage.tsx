import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Change import to useAuth
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { interestTags } from '../constants/interestTags'; // Use flat array
import ProfileAvatar from '../components/profile/ProfileAvatar'; // Import ProfileAvatar
import { Button } from '../components/ui/Button'; // Changed from button to Button

// Suggested emojis for quick selection
const suggestedEmojis = [
  '😀', '😊', '🥰', '😎', '🤩', '🧐', '🤓', '🦸‍♀️', '🦸‍♂️', '🦊', 
  '🐱', '🐶', '🐼', '🐯', '🦁', '🐵', '🐨', '🐮', '🦄', '🐙', 
  '🚀', '✨', '🌟', '🎮', '🎨', '🎬', '📚', '🎵', '⚽', '🏆',
  '💻', '🌈', '🌺', '🌴', '🏝️', '🏔️', '🍕', '🍦', '☕', '🧠'
];

const CompleteProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Change useAuth to useAuth
  const { user, loading: authLoading, setHasCompletedProfile, refreshUserData } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1 = Profile Info, 2 = Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (authLoading || !user) {
        console.log('CompleteProfilePage: Skipping loadUserData - auth loading or no user.');
        return;
      }
      try {
        console.log('CompleteProfilePage: Loading user data from user object:', user.id);
        
        // Check if user is already marked as having completed their profile
        const isProfileComplete = user.user_metadata?.profile_completed === true;
        console.log('Profile complete in metadata:', isProfileComplete);
        
        // Load data from various sources, prioritizing what's already stored
        // Start with auth metadata (most reliable source)
        if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
          console.log('Loaded fullName from metadata:', user.user_metadata.full_name);
        } else if (user.email) {
          // Use email username as fallback
          setFullName(user.email.split('@')[0]);
          console.log('Set fallback fullName from email:', user.email.split('@')[0]);
        }
        
        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
          console.log('Loaded avatarUrl from metadata');
        }

        if (user.user_metadata?.avatar_emoji) {
          setSelectedEmoji(user.user_metadata.avatar_emoji);
          console.log('Loaded avatarEmoji from metadata');
        }

        if (user.user_metadata?.interests && Array.isArray(user.user_metadata.interests)) {
          setSelectedInterests(user.user_metadata.interests);
          console.log('Loaded interests from metadata:', user.user_metadata.interests);
        }
        
        // Also check the profiles table for a more complete record
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error loading profile data:', profileError);
          }
          
          if (profileData) {
            console.log('Found profile data in database');
            // Only set values if they're not already set from metadata
            if (profileData.full_name && !fullName) {
              setFullName(profileData.full_name);
              console.log('Loaded fullName from database:', profileData.full_name);
            }
            
            if (profileData.avatar_url && !avatarUrl) {
              setAvatarUrl(profileData.avatar_url);
              console.log('Loaded avatarUrl from database');
            }
            
            if (profileData.avatar_emoji && !selectedEmoji) {
              setSelectedEmoji(profileData.avatar_emoji);
              console.log('Loaded avatarEmoji from database');
            }
          }
        } catch (dbError) {
          console.error('Error querying profiles database:', dbError);
        }
        
        // Check user_interests table for a more complete record of interests
        try {
          const { data: interestsData, error: interestsError } = await supabase
            .from('user_interests')
            .select('interest')
            .eq('user_id', user.id);
            
          if (interestsError) {
            console.error('Error loading interests:', interestsError);
          }
          
          if (interestsData && interestsData.length > 0 && selectedInterests.length === 0) {
            const loadedInterests = interestsData.map(item => item.interest);
            setSelectedInterests(loadedInterests);
            console.log('Loaded interests from database:', loadedInterests);
          }
        } catch (interestsError) {
          console.error('Error querying interests database:', interestsError);
        }
        
        // Finally check the users table
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, avatar_url, avatar_emoji, interests')
            .eq('id', user.id)
            .maybeSingle();
            
          if (userError && userError.code !== 'PGRST116') {
            console.error('Error loading user data:', userError);
          }
          
          if (userData) {
            console.log('Found user data in database');
            // Only set if not already set from other sources
            if (userData.full_name && !fullName) {
              setFullName(userData.full_name);
              console.log('Loaded fullName from users table:', userData.full_name);
            }
            
            if (userData.avatar_url && !avatarUrl) {
              setAvatarUrl(userData.avatar_url);
              console.log('Loaded avatarUrl from users table');
            }
            
            if (userData.avatar_emoji && !selectedEmoji) {
              setSelectedEmoji(userData.avatar_emoji);
              console.log('Loaded avatarEmoji from users table');
            }
            
            if (userData.interests && Array.isArray(userData.interests) && selectedInterests.length === 0) {
              setSelectedInterests(userData.interests);
              console.log('Loaded interests from users table:', userData.interests);
            }
          }
        } catch (userDbError) {
          console.error('Error querying users database:', userDbError);
        }
      } catch (error) {
        console.error('Error in loadUserData:', error);
      }
    };

    loadUserData();

    // Dependency array now includes authLoading and user
  }, [user, authLoading]);

  const handleNextStep = () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!avatarUrl && !selectedEmoji) {
        toast.error('Please select an avatar or emoji');
        return;
    }
    setStep(2);
  };

  // Fix for error around line 203-217 - likely in Promise.push() calls
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedInterests.length === 0) {
      toast.error('Please select at least 1 interest');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('CompleteProfilePage: Submitting profile data');

      // Update all tables in parallel for maximum reliability
      const promises: Promise<void>[] = []; // Explicitly type the promises array

      // 1. Update auth metadata first (fastest & most reliable)
      promises.push(
        supabase.auth.updateUser({
          data: {
            full_name: fullName,
            avatar_url: avatarUrl,
            avatar_emoji: selectedEmoji,
            interests: selectedInterests,
            profile_completed: true
          }
        }).then(({ error }) => {
          if (error) {
            console.error('Error updating auth metadata:', error);
          } else {
            console.log('Auth metadata updated successfully');
          }
        }) as unknown as Promise<void> // Cast to expected type
      );

      // 2. Update or create the user record in the profiles table
      promises.push(
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName,
            avatar_url: avatarUrl,
            avatar_emoji: selectedEmoji,
            is_profile_complete: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .then(({ error }) => {
            if (error) {
              console.error('Error updating profiles table:', error);
            } else {
              console.log('Profiles table updated successfully');
            }
          }) as unknown as Promise<void> // Cast to expected type
      );

      // 3. Update or create the user record in the users table
      promises.push(
        supabase
          .from('users')
          .upsert({
            id: user.id,
            full_name: fullName,
            avatar_url: avatarUrl,
            avatar_emoji: selectedEmoji,
            interests: selectedInterests,
            profile_completed: true,
            email: user.email
          }, { onConflict: 'id' })
          .then(({ error }) => {
            if (error) {
              console.error('Error updating users table:', error);
            } else {
              console.log('Users table updated successfully');
            }
          }) as unknown as Promise<void> // Cast to expected type
      );

      // 4. Update the user_interests table
      // Delete existing interests first
      promises.push(
        supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .then(async ({ error: deleteError }) => {
            if (deleteError) {
              console.error('Error deleting existing interests:', deleteError);
            } else {
              console.log('Existing interests deleted successfully');
              // Insert new interests if any are selected
              if (selectedInterests.length > 0) {
                const interestRecords = selectedInterests.map(interest => ({
                  user_id: user.id,
                  interest
                }));
                const { error: insertError } = await supabase
                  .from('user_interests')
                  .insert(interestRecords);
                if (insertError) {
                  console.error('Error inserting new interests:', insertError);
                } else {
                  console.log('New interests inserted successfully');
                }
              }
            }
          }) as unknown as Promise<void> // Cast to expected type
      );

      // Wait for all updates to finish
      const results = await Promise.allSettled(promises);
      console.log('Profile update results:', results);

      // Check if any critical updates failed
      const authUpdateFailed = results[0].status === 'rejected';
      const profileUpdateFailed = results[1].status === 'rejected';
      
      if (authUpdateFailed || profileUpdateFailed) {
        toast.error('Failed to save profile. Please try again.');
      } else {
        setHasCompletedProfile(true);
        toast.success('Profile completed successfully!');
        await refreshUserData();
        navigate('/');
      }
    } catch (error) {
      console.error('Error submitting profile:', error);
      toast.error('An error occurred while saving your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    console.log('CompleteProfilePage: Skipping profile completion');
    // Optionally mark the profile as skipped or just navigate
    
    // You could update a flag in the database here if needed
    // For now, just navigate
    
    // Refresh user data and navigate
    refreshUserData()
      .then(() => {
        // Mark locally that profile is considered complete for this session
        setHasCompletedProfile(true); 
        
        toast.success('Profile completion skipped');
        navigate('/home', { replace: true }); // ADDED navigation
      })
      .catch(error => {
        console.error('Error during skip process:', error);
        toast.error('Could not skip profile completion, please try again.');
        // Still try to navigate even if other steps fail
        navigate('/home', { replace: true });
      });
  };

  const handleAvatarChange = (type: 'url' | 'emoji' | 'file', value: string | File) => {
    if (type === 'url') {
      setAvatarUrl(value as string);
      setSelectedEmoji(null);
    } else if (type === 'emoji') {
      setSelectedEmoji(value as string);
      setAvatarUrl(null);
    } else if (type === 'file') {
      if (value instanceof File) {
          handleAvatarUpload(value); // Reuse existing upload logic if needed
      } else {
          setAvatarUrl(value as string); // Assume value is URL if not File
          setSelectedEmoji(null);
      }
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (data.publicUrl) {
        setAvatarUrl(data.publicUrl);
        setSelectedEmoji(null); // Clear emoji if URL is set
        toast.success('Avatar uploaded!');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      } else if (prev.length < 10) {
        return [...prev, interest];
      } else {
        toast.error('You can select up to 10 interests.');
        return prev;
      }
    });
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading session...</div>;
  }

  if (!authLoading && !user) {
    console.log("CompleteProfilePage: Auth loaded, but no user found. Redirecting to login.");
    useEffect(() => {
        navigate('/login');
    }, [navigate]);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 space-y-8">
        
        {/* Step Indicator */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 1 ? 'Complete Your Profile' : 'Select Your Interests'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1 ? 'Tell us about yourself' : 'Choose what you love (up to 10)'}
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-4">
            <div 
              className="bg-gradient-to-r from-rose-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${step === 1 ? '50%' : '100%'}` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Profile Info & Avatar */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder='Enter your full name'
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Choose Your Avatar *
                </label>
                <ProfileAvatar 
                  userId={user?.id} 
                  avatarUrl={avatarUrl}
                  avatarEmoji={selectedEmoji}
                  fullName={fullName}
                  size="lg"
                  editable={true}
                  onAvatarChange={handleAvatarChange}
                  suggestedEmojis={suggestedEmojis} // Pass suggested emojis
                />
              </div>
              
              <Button 
                type="button" 
                onClick={handleNextStep}
                className="w-full"
              >
                Next: Select Interests
              </Button>
            </div>
          )}

          {/* Step 2: Interests Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selected Interests ({selectedInterests.length}/10)
                  </label>
                  {/* Display Selected Interests First */}
                  {selectedInterests.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2 p-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      {selectedInterests.map(interest => (
                          <button
                          key={`${interest}-${Math.random()}`}
                          onClick={() => toggleInterest(interest)}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-700"
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              
              {/* Interest Selection Area - Re-added scrollable selection */}
              <div className="max-h-60 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-lg scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                <div className="flex flex-wrap gap-2">
                  {interestTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      disabled={selectedInterests.includes(tag)} // Disable if already selected
                      className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${ 
                        selectedInterests.includes(tag)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400 opacity-70' // Style for disabled/selected
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-rose-100 hover:to-indigo-100 dark:hover:from-rose-900/50 dark:hover:to-indigo-900/50 hover:shadow' // Style for available
                      }`}
                    >
                      {/* TODO: Add emoji here if desired */}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Select at least one interest to help us connect you with relevant content.
              </p>

              {/* Re-add Back/Finish buttons */}
              <div className="flex justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  onClick={() => setStep(1)}
                  variant="secondary"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || selectedInterests.length === 0}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Finishing...
                    </div>
                  ) : 'Finish Setup'}
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* Re-add Skip button */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleSkip}
          className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 mt-2"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
};

export default CompleteProfilePage;