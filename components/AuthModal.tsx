import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { signup, login } = useAuth();
  const [mode, setMode] = useState<'login'|'signup'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signup(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <h3 className="text-lg font-bold mb-2">{mode === 'signup' ? 'Create account' : 'Sign in'}</h3>
        <p className="text-sm text-gray-600 mb-4">Use a simple username & password. We create an account without requiring your email.</p>
        <label className="block text-xs font-medium text-gray-700">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full p-2 rounded border my-2" />
        <label className="block text-xs font-medium text-gray-700">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className="w-full p-2 rounded border my-2" />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded">{loading ? 'Please wait...' : (mode === 'signup' ? 'Create' : 'Sign in')}</button>
            <button type="button" onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          </div>
          <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-sm text-primary underline">
            {mode === 'signup' ? 'Already have an account?' : "Don't have one?"}
          </button>
        </div>
      </form>
    </div>
  );
};
