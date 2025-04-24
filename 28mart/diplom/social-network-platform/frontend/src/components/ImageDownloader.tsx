import React, { useEffect } from 'react';
import { GROUP_IMAGES, EVENT_IMAGES, PROFILE_IMAGES } from '../constants/images';

// Function to check if an image exists in the public directory
const imageExists = async (path: string): Promise<boolean> => {
  try {
    const response = await fetch(path);
    return response.ok;
  } catch {
    return false;
  }
};

// Function to download image and save it to the public directory
const downloadImage = async (url: string, filename: string) => {
  try {
    // Check if image already exists
    if (await imageExists(`/images/${filename}`)) {
      return;
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error(`Error downloading image ${filename}:`, error);
  }
};

const ImageDownloader: React.FC = () => {
  useEffect(() => {
    const downloadImages = async () => {
      // Check if we've already downloaded images in this session
      const hasDownloaded = localStorage.getItem('imagesDownloaded');
      if (hasDownloaded) return;

      // Download group images
      for (const [key, path] of Object.entries(GROUP_IMAGES)) {
        const filename = path.split('/').pop() || '';
        await downloadImage(`https://source.unsplash.com/600x400/?${key.toLowerCase()}`, filename);
      }

      // Download event images
      for (const [key, path] of Object.entries(EVENT_IMAGES)) {
        const filename = path.split('/').pop() || '';
        await downloadImage(`https://source.unsplash.com/600x400/?${key.toLowerCase().replace('_', ' ')}`, filename);
      }

      // Download profile images
      for (const [key, path] of Object.entries(PROFILE_IMAGES)) {
        if (key === 'DEFAULT') continue;
        const filename = path.split('/').pop() || '';
        const gender = key.startsWith('MALE') ? 'man' : 'woman';
        await downloadImage(`https://source.unsplash.com/400x400/?${gender} portrait`, filename);
      }

      // Mark that we've downloaded images in this session
      localStorage.setItem('imagesDownloaded', 'true');
    };

    downloadImages();
  }, []);

  return null;
};

export default ImageDownloader;
