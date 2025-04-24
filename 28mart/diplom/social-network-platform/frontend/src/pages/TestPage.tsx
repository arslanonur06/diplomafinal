import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const TestPage: React.FC = () => {
  const handleTestAuth = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      });
      
      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Success! Check console for details.');
        console.log('Success:', data);
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900">Test Page</h1>
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-sm font-mono break-all">
              <strong>Supabase URL:</strong><br/>
              {import.meta.env.VITE_SUPABASE_URL}
            </p>
          </div>
          <div className="space-y-4">
            <Link
              to="/login"
              className="block w-full py-2 px-4 bg-blue-500 text-white text-center rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Login
            </Link>
            <Link
              to="/register"
              className="block w-full py-2 px-4 bg-green-500 text-white text-center rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Go to Register
            </Link>
            <button
              onClick={handleTestAuth}
              className="w-full py-2 px-4 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Test Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
