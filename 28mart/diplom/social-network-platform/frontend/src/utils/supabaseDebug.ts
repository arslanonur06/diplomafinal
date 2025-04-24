import { supabase } from './supabaseClient';

/**
 * Utility to check Supabase connection and configuration status
 * Can be used to diagnose issues with the Supabase connection
 */
export const checkSupabaseConnection = async () => {
  console.log('=== Supabase Connection Check ===');
  
  try {
    // Check if the Supabase URL and Anon key environment variables are set
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Supabase URL:', supabaseUrl ? `✅ Configured (${supabaseUrl})` : '❌ Missing');
    console.log('Supabase Anon Key:', supabaseAnonKey ? '✅ Configured' : '❌ Missing');
    
    // Test a simple query to check if we can connect to Supabase
    console.log('Testing connection...');
    const start = Date.now();
    const { data, error } = await supabase.from('groups').select('id').limit(1);
    const duration = Date.now() - start;
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error details:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error
      };
    }
    
    console.log(`✅ Connection successful (${duration}ms)`);
    console.log('Data received:', data);
    
    // Check current auth status
    const { data: authData } = await supabase.auth.getSession();
    const isLoggedIn = !!authData.session;
    
    console.log('Authentication status:', isLoggedIn ? '✅ Logged in' : '❓ Not logged in');
    
    if (isLoggedIn) {
      console.log('Session expires at:', new Date(authData.session!.expires_at! * 1000).toLocaleString());
    }
    
    // Check if RLS policies might be blocking requests
    console.log('\nRLS Policy Check:');
    console.log('- If queries are failing only for certain tables, it might be a Row Level Security (RLS) issue');
    console.log('- Verify that appropriate RLS policies are in place for the tables you\'re accessing');
    console.log('- Make sure your user has the required permissions');
    
    return {
      success: true,
      message: 'Supabase connection is working',
      isLoggedIn,
      sessionExpiry: isLoggedIn ? new Date(authData.session!.expires_at! * 1000) : null
    };
  } catch (err) {
    console.error('❌ Fatal error during connection check:', err);
    return {
      success: false,
      message: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      error: err
    };
  } finally {
    console.log('=== End of Connection Check ===');
  }
};

/**
 * Test database access to specific tables
 * @param tables List of tables to test access to
 */
export const testTableAccess = async (tables: string[]) => {
  console.log('=== Testing Table Access ===');
  const results: Record<string, { success: boolean; error?: any; data?: any }> = {};
  
  for (const table of tables) {
    try {
      console.log(`Testing access to '${table}'...`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.error(`❌ Cannot access '${table}':`, error.message);
        results[table] = { success: false, error };
      } else {
        console.log(`✅ Successfully accessed '${table}'`);
        results[table] = { success: true, data };
      }
    } catch (err) {
      console.error(`❌ Error testing '${table}':`, err);
      results[table] = { success: false, error: err };
    }
  }
  
  console.log('=== Table Access Results ===');
  for (const [table, result] of Object.entries(results)) {
    console.log(`${table}: ${result.success ? '✅ Accessible' : '❌ Inaccessible'}`);
  }
  
  return results;
};

export default { checkSupabaseConnection, testTableAccess }; 