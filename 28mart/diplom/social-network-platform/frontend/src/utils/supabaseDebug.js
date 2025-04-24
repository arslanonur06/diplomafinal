import { supabase } from '../services/supabase';

/**
 * Check the connection to Supabase
 * @returns {Promise<Object>} Connection status
 */
export async function checkSupabaseConnection() {
  try {
    console.log('Checking Supabase connection...');
    const startTime = Date.now();
    
    // Perform a simple check by getting the server timestamp
    const { data, error } = await supabase.rpc('get_timestamp');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (error) {
      console.error('Supabase connection error:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error,
        responseTime
      };
    }
    
    console.log('Supabase connection successful:', data);
    return {
      success: true,
      message: `Connected successfully (${responseTime}ms)`,
      timestamp: data,
      responseTime
    };
  } catch (error) {
    console.error('Unexpected error checking connection:', error);
    
    // Fallback to a simpler check if the RPC fails
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();
        
      if (fallbackError) {
        return {
          success: false,
          message: `Connection failed with fallback check: ${fallbackError.message}`,
          error: fallbackError
        };
      }
      
      return {
        success: true,
        message: 'Connected successfully (fallback method)',
        fallback: true
      };
    } catch (fallbackError) {
      return {
        success: false,
        message: `Connection failed completely: ${error.message}`,
        error,
        fallbackError
      };
    }
  }
}

/**
 * Test access to specified database tables
 * @param {string[]} tableNames - Names of tables to test
 * @returns {Promise<Object>} Access status for each table
 */
export async function testTableAccess(tableNames) {
  const results = {};
  
  console.log('Testing table access for:', tableNames);
  
  for (const tableName of tableNames) {
    try {
      console.log(`Checking access to "${tableName}" table...`);
      
      // Try to get a single row from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`Error accessing "${tableName}" table:`, error);
        results[tableName] = {
          success: false,
          message: error.message,
          error
        };
      } else {
        console.log(`Successfully accessed "${tableName}" table`);
        results[tableName] = {
          success: true,
          message: `Table "${tableName}" is accessible`,
          hasData: Array.isArray(data) && data.length > 0
        };
      }
    } catch (error) {
      console.error(`Unexpected error testing "${tableName}" table:`, error);
      results[tableName] = {
        success: false,
        message: `Unexpected error: ${error.message}`,
        error
      };
    }
  }
  
  return results;
} 