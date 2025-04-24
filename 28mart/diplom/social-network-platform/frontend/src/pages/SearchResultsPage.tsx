import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const query = searchParams.get('q') || '';
  const [loading, setLoading] = useState(true);
  
  // Placeholder for search results
  const [results, setResults] = useState({
    users: [],
    posts: [],
    groups: [],
    events: []
  });

  useEffect(() => {
    // Reset loading state when query changes
    setLoading(true);
    
    // Simulate API call
    const fetchSearchResults = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.search(query);
        // setResults(response.data);
        
        // Simulating API delay
        setTimeout(() => {
          setLoading(false);
          // Mock data for now
          setResults({
            users: [],
            posts: [],
            groups: [],
            events: []
          });
        }, 1000);
      } catch (error) {
        console.error('Error fetching search results:', error);
        setLoading(false);
      }
    };

    if (query) {
      fetchSearchResults();
    } else {
      setLoading(false);
    }
  }, [query]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">{t('search.enterQuery')}</h1>
        <p className="text-gray-600">{t('search.startSearching')}</p>
      </div>
    );
  }

  const hasResults = 
    results.users.length > 0 || 
    results.posts.length > 0 || 
    results.groups.length > 0 || 
    results.events.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {t('search.resultsFor')} "{query}"
      </h1>

      {!hasResults ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-medium mb-2">{t('search.noResults')}</h2>
          <p className="text-gray-600">{t('search.tryDifferentKeywords')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Results would be rendered here */}
          <p className="text-gray-600">Search functionality will be implemented soon.</p>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage; 