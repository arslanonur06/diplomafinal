import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
           .on('error', reject)
           .once('close', () => resolve(filepath));
      } else {
        res.resume();
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
      }
    });
  });
};

const images = {
  groups: {
    'technology.jpg': 'computer,technology',
    'photography.jpg': 'camera,photography',
    'travel.jpg': 'travel,landscape',
    'music.jpg': 'music,concert',
    'art.jpg': 'art,painting',
    'food.jpg': 'food,cooking',
    'sports.jpg': 'sports,activity',
    'books.jpg': 'library,books',
    'gaming.jpg': 'gaming,videogames',
    'fashion.jpg': 'fashion,style',
    'fitness.jpg': 'fitness,gym',
    'business.jpg': 'business,office'
  },
  events: {
    'tech-conference.jpg': 'conference,technology',
    'art-exhibition.jpg': 'art,gallery',
    'music-festival.jpg': 'concert,festival',
    'networking.jpg': 'business,meeting',
    'workshop.jpg': 'workshop,learning',
    'photography.jpg': 'photography,camera',
    'sports.jpg': 'sports,stadium',
    'food-festival.jpg': 'food,festival'
  },
  profiles: {
    'male-1.jpg': 'man,portrait',
    'male-2.jpg': 'man,portrait',
    'male-3.jpg': 'man,portrait',
    'female-1.jpg': 'woman,portrait',
    'female-2.jpg': 'woman,portrait',
    'female-3.jpg': 'woman,portrait',
    'default-avatar.jpg': 'person,portrait'
  }
};

const baseDir = path.join(__dirname, '..', '..', 'public', 'images');

async function downloadAllImages() {
  for (const [category, categoryImages] of Object.entries(images)) {
    const categoryDir = path.join(baseDir, category);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    for (const [filename, searchTerms] of Object.entries(categoryImages)) {
      const filepath = path.join(categoryDir, filename);
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`Skipping ${filename} - already exists`);
        continue;
      }

      const url = `https://source.unsplash.com/featured/800x600/?${searchTerms}`;
      try {
        await downloadImage(url, filepath);
        console.log(`Downloaded ${filename}`);
        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error downloading ${filename}:`, error);
      }
    }
  }
}

downloadAllImages().then(() => {
  console.log('All images downloaded successfully!');
}).catch(console.error);
