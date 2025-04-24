export const interestTagsObject = {
  technology: [
    'Programming',
    'Artificial Intelligence',
    'Web Development',
    'Mobile Apps',
    'Cybersecurity',
    'Data Science',
    'Cloud Computing',
    'Blockchain',
    'IoT',
    'Gaming'
  ],
  arts: [
    'Visual Arts',
    'Music',
    'Photography',
    'Design',
    'Writing',
    'Film',
    'Theater',
    'Dance',
    'Fashion',
    'Crafts'
  ],
  lifestyle: [
    'Travel',
    'Fitness',
    'Food',
    'Health',
    'Sports',
    'Meditation',
    'Yoga',
    'Reading',
    'Cooking',
    'Outdoor Activities'
  ],
  business: [
    'Entrepreneurship',
    'Marketing',
    'Finance',
    'Leadership',
    'Innovation',
    'Strategy',
    'Management',
    'Sales',
    'Consulting',
    'E-commerce'
  ],
  education: [
    'Teaching',
    'Learning',
    'Research',
    'Academic Writing',
    'STEM',
    'Languages',
    'History',
    'Philosophy',
    'Psychology',
    'Literature'
  ]
} as const;

// Create a flat array of all interest tags
export const interestTags: string[] = Object.values(interestTagsObject).flat();

export type InterestCategory = keyof typeof interestTagsObject;
export type InterestTag = typeof interestTags[number];
