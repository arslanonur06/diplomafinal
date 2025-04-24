import React from 'react';

const ExplorePage = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Explore</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Trending Topics</h2>
          <div className="space-y-3">
            {['Photography', 'Technology', 'Travel', 'Cooking', 'Music'].map((topic) => (
              <div key={topic} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <span className="text-blue-500">#</span>
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Popular Groups</h2>
          <div className="space-y-4">
            {[
              { name: 'Tech Enthusiasts', members: '2.5k' },
              { name: 'Travel Photography', members: '1.8k' },
              { name: 'Cooking Club', members: '3.2k' }
            ].map((group) => (
              <div key={group.name} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <span>{group.name}</span>
                <span className="text-sm text-gray-500">{group.members} members</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {[
              { name: 'Photography Workshop', date: 'Mar 15' },
              { name: 'Tech Meetup', date: 'Mar 20' },
              { name: 'Cooking Class', date: 'Mar 25' }
            ].map((event) => (
              <div key={event.name} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <span>{event.name}</span>
                <span className="text-sm text-gray-500">{event.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
