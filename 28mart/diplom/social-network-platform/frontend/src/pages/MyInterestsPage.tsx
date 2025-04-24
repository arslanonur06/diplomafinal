import React, { useState } from 'react';

const MyInterestsPage = () => {
  const [interests, setInterests] = useState([
    { id: 1, name: 'Photography', level: 'Expert' },
    { id: 2, name: 'Technology', level: 'Intermediate' },
    { id: 3, name: 'Travel', level: 'Advanced' },
    { id: 4, name: 'Cooking', level: 'Beginner' }
  ]);

  const suggestedInterests = [
    'Music', 'Art', 'Sports', 'Reading', 'Gaming',
    'Fashion', 'Movies', 'Science', 'Nature', 'History'
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">My Interests</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Interests</h2>
            <div className="space-y-4">
              {interests.map((interest) => (
                <div
                  key={interest.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold">{interest.name}</h3>
                    <p className="text-sm text-gray-500">Level: {interest.level}</p>
                  </div>
                  <button className="text-red-500 hover:text-red-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Interest Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-rose-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Interests</p>
                <p className="text-2xl font-bold text-indigo-600">{interests.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Expert Level</p>
                <p className="text-2xl font-bold text-green-600">
                  {interests.filter(i => i.level === 'Expert').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Suggested Interests</h2>
          <div className="grid grid-cols-2 gap-2">
            {suggestedInterests.map((interest) => (
              <button
                key={interest}
                className="p-2 text-sm bg-gray-100 rounded-lg hover:bg-gradient-to-r hover:from-indigo-500 hover:to-rose-500 hover:text-white transition-colors"
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyInterestsPage;
