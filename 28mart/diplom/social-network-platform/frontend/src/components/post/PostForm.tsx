import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FiImage, FiX, FiSend } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';

interface PostFormProps {
  onSubmit: (post: { content: string; image_url?: string }) => Promise<void>;
  onCancel: () => void;
  initialContent?: string;
  groupId?: string;
}

const PostForm: React.FC<PostFormProps> = ({
  onSubmit,
  onCancel,
  initialContent = '',
  groupId
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [content, setContent] = useState(initialContent);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !imageFile) {
      toast.error('Please add some content or an image');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = '';
      
      // Upload image if present
      if (imageFile) {
        const filePath = `post-images/${user?.id}/${uuidv4()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile);
          
        if (uploadError) {
          throw new Error(`Error uploading image: ${uploadError.message}`);
        }
        
        const { data } = supabase.storage.from('posts').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }
      
      // Submit the post
      await onSubmit({
        content: content.trim(),
        image_url: imageUrl || undefined
      });
      
      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      
      toast.success('Post created successfully');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('placeholder.shareThoughts') || "What's on your mind?"}
          className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white resize-none"
          rows={4}
          disabled={isSubmitting}
        />
      </div>
      
      {imagePreview && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={imagePreview} alt="Preview" className="max-h-64 w-full object-cover" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-gray-800/70 p-1 rounded-full text-white hover:bg-gray-900/70"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <label className="cursor-pointer p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiImage className="text-indigo-500 dark:text-indigo-400" size={20} />
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isSubmitting}
            />
          </label>
        </div>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={isSubmitting}
          >
            {t('buttons.cancel') || 'Cancel'}
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-90 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
            disabled={isSubmitting || (!content.trim() && !imageFile)}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.posting') || 'Posting...'}
              </span>
            ) : (
              <span className="flex items-center">
                <FiSend className="mr-2" size={16} />
                {t('post.publish') || 'Post'}
              </span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PostForm;
