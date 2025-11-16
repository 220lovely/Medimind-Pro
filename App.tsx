import React, { useState, useCallback } from 'react';
import Dashboard from './components/Dashboard';

// AuthPage Component defined in the same file for simplicity
const AuthPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  const switchView = useCallback(() => setIsLoginView(v => !v), []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
            <svg className="mx-auto h-12 w-auto text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.375a6.375 6.375 0 0 0 6.375-6.375a6.375 6.375 0 0 0-6.375-6.375a6.375 6.375 0 0 0-6.375 6.375a6.375 6.375 0 0 0 6.375 6.375Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75h.007v.008H12v-.008Z" />
            </svg>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
            {isLoginView ? 'Welcome to MediMind Pro' : 'Create your Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your AI-powered health companion
          </p>
        </div>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          {!isLoginView && (
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full Name"
            />
          )}
          <input
            type="email"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
            defaultValue="demo@medimind.pro"
          />
          <input
            type="password"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
            defaultValue="password"
          />
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
          >
            {isLoginView ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {isLoginView ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchView} className="font-medium text-blue-600 hover:text-blue-500">
            {isLoginView ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
