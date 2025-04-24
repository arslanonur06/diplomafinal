import React from 'react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { FiGithub, FiLinkedin, FiTwitter, FiBriefcase } from 'react-icons/fi';

const ConnectPage = () => {
  const navigate = useNavigate();

  const suggestedConnections = [
    {
      id: 1,
      name: 'Sarah Johnson',
      interests: ['Photography', 'Travel'],
      mutualConnections: 5,
      avatar: 'https://i.pravatar.cc/150?img=1'
    },
    {
      id: 2,
      name: 'Michael Chen',
      interests: ['Technology', 'Music'],
      mutualConnections: 3,
      avatar: 'https://i.pravatar.cc/150?img=2'
    },
    {
      id: 3,
      name: 'Emma Wilson',
      interests: ['Art', 'Design'],
      mutualConnections: 7,
      avatar: 'https://i.pravatar.cc/150?img=3'
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Connect</h1>
      
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for people..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="absolute right-2 top-2 text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestedConnections.map((connection) => (
          <div key={connection.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={connection.avatar}
                alt={connection.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h2 className="text-xl font-semibold">{connection.name}</h2>
                <p className="text-gray-500">{connection.mutualConnections} mutual connections</p>
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {connection.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
            <Button className="w-full">
              Connect
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <Button onClick={() => navigate('/#contact')} className="w-full">
           Let's Connect
        </Button>
      </div>
    </div>
  );
};

export default ConnectPage;
