import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bodyWeight, setBodyWeight] = useState('75');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password, parseFloat(bodyWeight) || 75);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di registrazione');
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
          <p className="text-text-secondary mt-1 text-sm">Crea il tuo personaggio</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-input text-text-primary rounded-lg px-4 py-2.5 border border-transparent focus:border-accent focus:outline-none"
              placeholder="Guerriero123"
              required
            />
          </div>

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
            <label className="block text-sm text-text-secondary mb-1">
              Password <span className="text-xs">(min 8 caratteri)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-input text-text-primary rounded-lg px-4 py-2.5 border border-transparent focus:border-accent focus:outline-none"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Peso corporeo (kg){' '}
              <span className="text-xs text-text-secondary">— usato per calcolo XP</span>
            </label>
            <input
              type="number"
              value={bodyWeight}
              onChange={e => setBodyWeight(e.target.value)}
              className="w-full bg-input text-text-primary rounded-lg px-4 py-2.5 border border-transparent focus:border-accent focus:outline-none"
              min="30"
              max="300"
              step="0.5"
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
            {loading ? 'Creazione...' : 'Crea account'}
          </button>
        </form>

        {/* Link login */}
        <p className="text-center text-text-secondary text-sm mt-6">
          Hai già un account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
