import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { interestTags } from '../../constants/interestTags';
import ProfileAvatar from './ProfileAvatar';
import { Button } from '../ui/Button';

interface ProfileEditModalProps {
  profile: any;
  onProfileUpdated: () => void;
}

// Add interface for profile updates
interface ProfileUpdates {
  full_name: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  interests: string[];
  updated_at: string;
  avatar_url: string | null;
  cover_url?: string;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  profile,
  onProfileUpdated
}) => {
  const { tWithTemplate: t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    interests: [] as string[]
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        interests: profile.interests || []
      });
      setAvatarUrl(profile.avatar_url || null);
      setAvatarEmoji(profile.avatar_emoji || null);
      setCoverPreview(profile.cover_url || '');
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setForm(prev => {
      const interests = [...prev.interests];
      if (interests.includes(interest)) {
        return { ...prev, interests: interests.filter(i => i !== interest) };
      } else {
        if (interests.length < 10) {
          return { ...prev, interests: [...interests, interest] };
        }
        toast.error(t('profile.error.maxTags'));
        return prev;
      }
    });
  };

  const handleAvatarChange = (type: 'url' | 'emoji' | 'file', value: string | File) => {
    if (type === 'url' && typeof value === 'string') {
      setAvatarUrl(value);
    } else if (type === 'emoji' && typeof value === 'string') {
      setAvatarEmoji(value);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${path}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });
      
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.full_name.trim()) {
      toast.error(t('profile.error.fullNameRequired'));
      return;
    }
    
    try {
      setLoading(true);
      
      let updates: ProfileUpdates = {
        full_name: form.full_name,
        headline: form.headline,
        bio: form.bio,
        location: form.location,
        website: form.website,
        interests: form.interests,
        updated_at: new Date().toISOString(),
        avatar_url: avatarUrl || profile.avatar_url // Keep existing avatar_url if not changed
      };
      
      console.log('Updating profile with:', updates);
      
      // Upload cover if changed
      if (coverFile) {
        try {
          const coverUrl = await uploadFile(
            coverFile, 
            'covers', 
            profile.id
          );
          updates.cover_url = coverUrl;
        } catch (uploadError) {
          console.error('Cover upload error:', uploadError);
          throw new Error('Failed to upload cover image');
        }
      }
      
      // Update profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select();
        
      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }
      
      console.log('Profile updated successfully:', profileData);
      
      // Update auth metadata with both avatar info
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl || profile.avatar_url, // Keep existing avatar_url if not changed
          avatar_emoji: avatarEmoji
        }
      });

      if (authError) {
        console.error('Auth metadata update error:', authError);
        throw authError;
      }

      console.log('Auth metadata updated successfully:', authData);

      // Update interests if changed
      if (form.interests && form.interests.length > 0) {
        try {
          // First delete existing interests
          const { error: deleteError } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', profile.id);

          if (deleteError) {
            console.error('Error deleting existing interests:', deleteError);
            throw deleteError;
          }
          
          // Then insert new ones
          const interestRecords = form.interests.map(interest => ({
            user_id: profile.id,
            interest
          }));
          
          const { error: insertError } = await supabase
            .from('user_interests')
            .insert(interestRecords);

          if (insertError) {
            console.error('Error inserting new interests:', insertError);
            throw insertError;
          }
        } catch (interestsError) {
          console.error('Interests update error:', interestsError);
          throw new Error('Failed to update interests');
        }
      }
      
      toast.success(t('profile.success.updated'));
      onProfileUpdated();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || error.error_description || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Small delay to allow animation to complete
    setTimeout(() => {
      onProfileUpdated();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="relative h-40 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4">
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                No cover image
              </div>
            )}
            <label className="absolute bottom-2 right-2 bg-black/50 text-white p-1.5 rounded-full cursor-pointer hover:bg-black/70">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
            </label>
          </div>

          <div className="flex justify-center -mt-16 mb-4 z-10 relative">
            <ProfileAvatar
              userId={profile.id}
              avatarUrl={avatarUrl}
              avatarEmoji={avatarEmoji}
              fullName={form.full_name}
              size="xl"
              editable
              onAvatarChange={handleAvatarChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Headline
              </label>
              <input
                type="text"
                name="headline"
                value={form.headline}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Website
              </label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interests (Maximum 10)
            </label>
            <div className="flex flex-wrap gap-2">
              {interestTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInterestToggle(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${ 
                    form.interests.includes(tag)
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </form>
        
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={loading} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal; 