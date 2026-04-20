import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl p-8 shadow-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent">⚔️ FitQuest</h1>
          <p className="text-text-secondary mt-1 text-sm">Accedi al tuo account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-input text-text-primary rounded-lg px-4 py-2.5 border border-transparent focus:border-accent focus:outline-none"
              placeholder="tu@esempio.it"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-input text-text-primary rounded-lg px-4 py-2.5 border border-transparent focus:border-accent focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>

        {/* Link registrazione */}
        <p className="text-center text-text-secondary text-sm mt-6">
          Non hai un account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
