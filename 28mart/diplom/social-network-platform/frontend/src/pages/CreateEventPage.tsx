import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiImage, FiX, FiCalendar, FiMapPin, FiClock } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";

// Event categories
const categories = [
  'technology', 'business', 'education', 'entertainment', 
  'health', 'sports', 'travel', 'art', 'food', 'music'
];

const CreateEventPage: React.FC = () => {
  const { tWithTemplate: t } = useLanguage();
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    category: 'technology',
    isPrivate: false,
    maxAttendees: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: checked }));
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
      toast.error(t('errors.loginRequiredEvent') || 'You must be logged in to create an event');
      return;
    }
    
    if (!form.title.trim()) {
      toast.error(t('errors.eventNameRequired') || 'Event title is required');
      return;
    }
    
    if (!form.startDate) {
      toast.error(t('errors.eventDateRequired') || 'Start date is required');
      return;
    }
    
    if (!form.location.trim()) {
      toast.error('Location is required');
      return;
    }
    
    if (!form.category) {
      toast.error(t('errors.eventCategoryRequired'));
      return;
    }
    
    try {
      setLoading(true);
      
      let imageUrl = '';
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `event_images/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, selectedImage);
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }
      
      // Parse and validate max attendees input
      let maxAttendeesValue: number | null = null;
      if (form.maxAttendees.trim() !== '') {
        const parsedValue = parseInt(form.maxAttendees, 10);
        if (isNaN(parsedValue) || parsedValue <= 0) {
          toast.error('Invalid number for Max Attendees.');
          setLoading(false);
          return;
        }
        maxAttendeesValue = parsedValue;
      }
      
      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          title: form.title,
          description: form.description,
          start_date: form.startDate,
          end_date: form.endDate || null,
          location: form.location,
          category: form.category,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_public: !form.isPrivate,
          max_attendees: maxAttendeesValue,
          status: 'active'
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating event:', createError);
        throw createError;
      }
      
      console.log('Event created successfully:', newEvent);
      
      // Make sure the current user is added as an attendee
      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert({
          event_id: newEvent.id,
          user_id: user.id,
          status: 'going',
          joined_at: new Date().toISOString()
        });
        
      if (attendeeError) {
        console.error('Error adding creator as attendee:', attendeeError);
        // Continue anyway, we created the event
      }
      
      toast.success(t('success.eventCreated') || 'Event created successfully!');
      
      // Changed: Navigate to events page instead of event detail
      navigate('/events');
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(`${t('errors.eventCreationFailed')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-4xl mx-auto my-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        {t('createEvent.title') || 'Create a New Event'}
      </h1>
      
      {/* Information banner about temporary image upload issue */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 mb-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Note:</strong> Event image upload is temporarily disabled due to system maintenance. You can create events without images for now.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Image */}
        <div className="flex flex-col items-center">
          <div 
            className={`relative w-full max-w-2xl h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-700 opacity-60`}
          >
            <div className="text-center p-6">
              <FiImage className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400">Image upload temporarily disabled</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">This feature will be available soon</p>
            </div>
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 opacity-30"></div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            disabled
          />
        </div>
        
        {/* Event Title and Description */}
        <div className="space-y-6">
          {/* Event Title */}
          <div>
            <Label htmlFor="title" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('createEvent.nameLabel') || 'Event Title *'}
            </Label>
            <Input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder={t('createEvent.namePlaceholder') || 'E.g., Annual Tech Conference, Community Meetup'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
              required
            />
          </div>
          
          {/* Event Description */}
          <div>
            <Label htmlFor="description" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('createEvent.descriptionLabel') || 'Description'}
            </Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder={t('createEvent.descriptionPlaceholder') || 'Tell people more about the event'}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
            />
          </div>
        </div>
        
        {/* Location */}
        <div>
          <Label htmlFor="location" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('createEvent.locationLabel') || 'Location *'}
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMapPin className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder={t('createEvent.locationPlaceholder') || 'E.g., Conference Center, Online'}
              className="w-full pl-12 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
              required
            />
          </div>
        </div>
        
        {/* Date and Time */}
        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('createEvent.startDateLabel') || 'Start Date & Time'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createEvent.startDateLabel') || 'Start Date *'}
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="datetime-local"
                  id="startDate"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full pl-12 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="startTime" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createEvent.startTimeLabel') || 'Start Time'}
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiClock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  className="w-full pl-12 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="endDate" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createEvent.endDateLabel') || 'End Date & Time (Optional)'}
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full pl-12 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="endTime" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('createEvent.endTimeLabel') || 'End Time'}
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiClock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  className="w-full pl-12 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Category and Privacy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <Label htmlFor="category" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('createEvent.categoryLabel')}
            </Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('createEvent.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`events.categories.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Privacy Setting */}
          <div className="flex items-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              checked={form.isPrivate}
              onChange={handleCheckboxChange}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrivate" className="ml-3 block text-base text-gray-700 dark:text-gray-300">
              {form.isPrivate ? t('createEvent.visibilityPrivate') : t('createEvent.visibilityPublic')}
            </label>
          </div>
          
          {/* Max Attendees */}
          <div>
            <Label htmlFor="max_attendees" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('createEvent.maxAttendeesLabel')}
            </Label>
            <Input
              id="max_attendees"
              type="number"
              name="maxAttendees"
              value={form.maxAttendees}
              onChange={handleChange}
              placeholder={t('createEvent.maxAttendeesPlaceholder')}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base"
            />
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={() => navigate('/events')}
            className="px-6 py-3 text-base border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
          >
            {t('buttons.cancel') || 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className={`px-6 py-3 ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-slate-400 to-rose-300 hover:from-slate-500 hover:to-rose-400'} text-white rounded-lg transition-colors flex items-center justify-center font-medium text-base min-w-[120px]`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              t('createEvent.createButton') || 'Create Event'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage; 