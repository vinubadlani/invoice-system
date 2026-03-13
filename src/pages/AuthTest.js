import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from '@/lib/supabaseClient';
import api from '@/lib/api';

const AuthTest = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Sign Up Form
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  
  // Sign In Form
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { user } = await auth.getUser();
    setUser(user);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await auth.signUp(
        signUpData.email,
        signUpData.password,
        signUpData.fullName
      );

      if (error) {
        setMessage(`Sign up error: ${error.message}`);
      } else {
        setMessage('✅ Sign up successful! Check your email for confirmation.');
        setSignUpData({ email: '', password: '', fullName: '' });
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await auth.signIn(
        signInData.email,
        signInData.password
      );

      if (error) {
        setMessage(`Sign in error: ${error.message}`);
      } else {
        setMessage('✅ Sign in successful!');
        setSignInData({ email: '', password: '' });
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { error } = await auth.signOut();

      if (error) {
        setMessage(`Sign out error: ${error.message}`);
      } else {
        setMessage('✅ Signed out successfully!');
        setUser(null);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testRPC = async () => {
    if (!user) {
      setMessage('❌ You must be logged in to test RPC');
      return;
    }

    setLoading(true);
    setMessage('Testing RPC call...');

    try {
      const { data, error } = await api.business.getAll();

      if (error) {
        setMessage(`❌ RPC Error: ${error.message}`);
      } else {
        setMessage(`✅ RPC Success! Found ${data?.length || 0} businesses.`);
        console.log('Businesses:', data);
      }
    } catch (error) {
      setMessage(`❌ Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">🔐 Auth Test Page</h1>
          <p className="text-gray-600">Test Supabase Authentication & RPC</p>
        </div>

        {/* Status Message */}
        {message && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm font-medium">{message}</p>
            </CardContent>
          </Card>
        )}

        {/* Current User */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold mb-4">Current User</h3>
            {user ? (
              <div className="space-y-2">
                <p className="text-sm"><strong>Email:</strong> {user.email}</p>
                <p className="text-sm"><strong>ID:</strong> {user.id}</p>
                <p className="text-sm"><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                <div className="pt-4 space-x-2">
                  <Button onClick={handleSignOut} disabled={loading}>
                    Sign Out
                  </Button>
                  <Button onClick={testRPC} disabled={loading} variant="outline">
                    Test RPC Call
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Not logged in</p>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sign Up Form */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4">Sign Up</h3>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Processing...' : 'Sign Up'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sign In Form */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4">Sign In</h3>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Processing...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold mb-2">✅ What to Test</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>Run the migration:</strong> Copy all SQL from <code>db/supabase-migration.sql</code> and run in Supabase SQL Editor</li>
              <li><strong>Sign Up:</strong> Create a new account (check email for confirmation if enabled)</li>
              <li><strong>Sign In:</strong> Login with your credentials</li>
              <li><strong>Test RPC:</strong> Click "Test RPC Call" to verify database connection</li>
              <li><strong>Sign Out:</strong> Test logout functionality</li>
            </ol>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold mb-2">🔍 Debug Info</h3>
            <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
              <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || '❌ Not set'}</p>
              <p><strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ? '✅ Set' : '❌ Not set'}</p>
              <p><strong>Auth Status:</strong> {user ? '✅ Authenticated' : '❌ Not authenticated'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthTest;
