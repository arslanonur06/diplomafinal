import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiImage, FiX } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
// Change import to useAuth
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button'; // Changed from button to Button
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Group categories
const categories = [
  'technology', 'business', 'education', 'entertainment', 
  'health', 'sports', 'travel', 'art', 'food', 'music'
];

const CreateGroupPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  // Change useAuth to useAuth
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'technology',
    isPrivate: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('File must be an image');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImagePreview('');
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(t('errors.loginRequiredGroup') || 'You must be logged in to create a group');
      return;
    }
    
    if (!form.name.trim()) {
      toast.error(t('errors.groupNameRequired') || 'Group name is required');
      return;
    }
    
    if (!form.category) {
      toast.error(t('errors.groupCategoryRequired') || 'Please select a category for the group');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Starting group creation with user:', user.id);

      // === Add Session Refresh and Verification Start ===
      console.log('Refreshing session before group creation...');
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          // Log the error but proceed, getSession will handle invalid session
          console.warn('Session refresh attempt failed:', refreshError.message);
        }
      } catch (refreshErr) {
         console.warn('Exception during session refresh:', refreshErr);
      }


      console.log('Re-verifying session before insert...');
      const { data: currentSessionData, error: currentSessionError } = await supabase.auth.getSession();

      if (currentSessionError || !currentSessionData.session) {
          console.error('Session invalid right before insert:', currentSessionError);
          toast.error('Authentication session problem. Please log in again.');
          setLoading(false); // Ensure loading state is cleared
          // Optionally navigate to login or call a sign-out handler
          // navigate('/login');
          return;
      }
      const currentAuthUserId = currentSessionData.session.user.id;
      console.log('Current authenticated user ID for group creation:', currentAuthUserId);

      // Optional: Warn if there's a mismatch, though using currentAuthUserId should be safe
      if (currentAuthUserId !== user.id) {
          console.warn('User ID mismatch detected before insert! Using latest session ID.');
      }
      // === Add Session Refresh and Verification End ===

      // Upload the image if selected
      let imageUrl = '';
      if (selectedImage) {
        try {
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `group_images/${fileName}`;
          
          console.log('Uploading image:', filePath);
          
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, selectedImage, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            if (uploadError.message.includes('File size limit')) {
              toast.error('Image must be less than 5MB');
            } else if (uploadError.message.includes('Invalid file type')) {
              toast.error('File must be an image (PNG, JPG, GIF)');
            } else {
              toast.error('Failed to upload image. Please try again.');
            }
            return;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
            
          imageUrl = publicUrl;
          console.log('Image uploaded successfully:', imageUrl);
        } catch (error) {
          console.error('Error in image upload:', error);
          toast.error('Failed to upload image. Please try again.');
          return;
        }
      }
      
      // Prepare group data
      const groupData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        privacy: form.isPrivate ? 'private' : 'public',
        image_url: imageUrl,
        created_by: currentAuthUserId,
        created_at: new Date().toISOString()
      };
      
      console.log('Creating group with data:', groupData);
      
      // First, create the group
      let newGroup;
      const { data: initialGroupData, error: createError } = await supabase
        .from('groups')
        .insert(groupData)
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating group:', createError);
        console.error('Error details:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        
        if (createError.code === '23505') {
          toast.error('A group with this name already exists');
        } else if (createError.message.includes('created_by')) {
          // Try to create the group without created_by first
          const { data: groupWithoutCreator, error: retryError } = await supabase
            .from('groups')
            .insert({
              ...groupData,
              created_by: null
            })
            .select()
            .single();
            
          if (retryError) {
            console.error('Error in retry:', retryError);
            toast.error('Failed to create group. Please try again.');
            return;
          }
          
          // Update the group with created_by
          const { error: updateError } = await supabase
            .from('groups')
            .update({ created_by: user.id })
            .eq('id', groupWithoutCreator.id);
            
          if (updateError) {
            console.error('Error updating creator:', updateError);
            toast.error('Failed to set group creator. Please try again.');
            return;
          }
          
          // Continue with the rest of the process
          newGroup = groupWithoutCreator;
        } else if (createError.message.includes('is_private')) {
          toast.error('Error: Unable to set group privacy. Please try again.');
        } else if (createError.message.includes('rules')) {
          toast.error('Error: Unable to set group rules. Please try again.');
        } else if (createError.message.includes('permission denied')) {
          toast.error('Error: You do not have permission to create groups.');
        } else {
          toast.error(`Failed to create group: ${createError.message}`);
        }
        return;
      }
      
      newGroup = initialGroupData;
      console.log('Group created successfully:', newGroup);
      
      // Add the creator as a member and admin
      console.log('Adding creator as member:', { group_id: newGroup.id, user_id: user.id });
      const { error: memberError } = await supabase.rpc('create_group_member', {
        p_group_id: newGroup.id,
        p_user_id: user.id,
        p_role: 'admin',
        p_status: 'approved'
      });
      
      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        console.error('Error details:', {
          code: memberError.code,
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint
        });
        
        // Try to delete the group since we couldn't add the creator as a member
        await supabase
          .from('groups')
          .delete()
          .eq('id', newGroup.id);
          
        toast.error('Failed to set up group membership. Please try again.');
        return;
      }
      
      // Update the member count
      const { error: updateError } = await supabase
        .from('groups')
        .update({ member_count: 1 })
        .eq('id', newGroup.id);
        
      if (updateError) {
        console.error('Error updating member count:', updateError);
        // Don't fail the whole operation for this error
      }
      
      toast.success(t('success.groupCreated') || 'Group created successfully!');
      // Force navigation to chat page
      window.location.href = `/groups/${newGroup.id}/chat`;
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(`${t('errors.groupCreationFailed') || 'Failed to create group'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-4xl mx-auto my-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        {t('createGroup.title') || 'Create a New Group'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Group Image */}
        <div className="flex flex-col items-center">
          <div 
            onClick={handleImageClick}
            className={`relative w-full max-w-2xl h-64 border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-gray-300 dark:border-gray-600'} rounded-lg flex items-center justify-center cursor-pointer overflow-hidden`}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Group" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={clearImage}
                  className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                >
                  <FiX size={20} />
                </button>
              </>
            ) : (
              <div className="text-center p-6">
                <FiImage className="mx-auto h-16 w-16 text-gray-400" />
                <p className="mt-4 text-base text-gray-500 dark:text-gray-400">Click to upload group image</p>
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
        </div>
        
        {/* Main Form Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Group Name */}
            <div>
              <Label htmlFor="name" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createGroup.nameLabel') || 'Group Name *'}
              </Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('createGroup.namePlaceholder') || 'E.g., Tech Enthusiasts, Book Club'}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                required
              />
            </div>
            
            {/* Category */}
            <div>
              <Label htmlFor="category" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createGroup.categoryLabel') || 'Category'}
              </Label>
              <Select onValueChange={(value) => setForm({ ...form, category: value })} value={form.category} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('createGroup.categoryPlaceholder') || 'Select a category...'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`groups.categories.${cat}`) || cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Privacy Setting */}
            <div className="flex items-center mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <input
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={form.isPrivate}
                onChange={handleChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPrivate" className="ml-3 block text-base text-gray-700 dark:text-gray-300">
                {t('createGroup.visibilityLabel') || 'Visibility'}
              </label>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            {/* Group Description */}
            <div>
              <Label htmlFor="description" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createGroup.descriptionLabel') || 'Description'}
              </Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={t('createGroup.descriptionPlaceholder') || 'What is this group about?'}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
              />
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={() => navigate('/groups')}
            variant="outline"
            disabled={loading}
          >
            {t('buttons.cancel') || 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className={`px-6 py-3 ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-90'} text-white rounded-lg transition-colors flex items-center justify-center font-medium text-base min-w-[120px]`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              t('createGroup.createButton') || 'Create Group'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupPage;
