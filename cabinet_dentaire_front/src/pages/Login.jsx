import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CabinetLogo } from '../components/CabinetLogo';

export const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.message);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="relative z-10 w-full max-w-4xl mx-auto px-2">
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 border border-gray-200">
          {/* Left: illustration/image */}
          <div className="hidden md:block relative overflow-hidden min-h-105 bg-linear-to-br from-blue-50 via-white to-indigo-50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.12),transparent_28%)]" />
            <div className="relative h-full min-h-105 flex items-center justify-center p-10">
              <div className="w-full h-full rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-inner flex items-center justify-center p-10">
                <CabinetLogo
                  alt="Logo du cabinet"
                  className="w-full h-full max-w-85 max-h-85 object-contain drop-shadow-sm rounded-none border-0 bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Right: form section */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Clinique Médicale</h1>
              <p className="text-gray-600">Connectez-vous à votre compte</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting || loading}
                  required
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting || loading}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 mt-6">
              <p className="text-sm font-medium text-gray-700">Compte de démonstration :</p>
              <p className="text-sm text-gray-600">
                <span className="font-mono bg-white px-2 py-1 rounded">admin@example.com</span>
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-mono bg-white px-2 py-1 rounded">password</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
