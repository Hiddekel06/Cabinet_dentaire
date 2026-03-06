import { useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../services/api';

const ImportDentalActs = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dentalActs, setDentalActs] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier Excel');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/dental-acts/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      setFile(null);
      
      // Recharger la liste après import
      loadDentalActs();
      
    } catch (err) {
      console.error('Erreur import:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const loadDentalActs = async () => {
    try {
      const response = await api.get('/api/dental-acts');
      setDentalActs(response.data);
    } catch (err) {
      console.error('Erreur chargement:', err);
    }
  };

  const handleTruncate = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUS les actes dentaires ?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete('/api/dental-acts/truncate');
      alert('Tous les actes ont été supprimés');
      setDentalActs([]);
      setResult(null);
    } catch (err) {
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Import des Actes Dentaires
        </h1>

        {/* Section Upload */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📤 Importer depuis Excel</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichier Excel (.xlsx, .xls, .csv)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={loading || !file}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Import en cours...
                  </span>
                ) : (
                  'Importer'
                )}
              </button>

              <button
                onClick={loadDentalActs}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Recharger la liste
              </button>

              <button
                onClick={handleTruncate}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                Tout supprimer
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Résultat */}
          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">✅ {result.message}</h3>
              <div className="text-sm text-green-800">
                <p>• Importés: <span className="font-bold">{result.stats.imported}</span></p>
                <p>• Ignorés: <span className="font-bold">{result.stats.skipped}</span></p>
                <p>• Total: <span className="font-bold">{result.stats.total}</span></p>
              </div>
              {result.errors && result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-orange-700 font-medium">
                    ⚠️ Voir les erreurs ({result.errors.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-orange-800">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Liste des actes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📋 Actes Dentaires ({dentalActs.length})</h2>
            {dentalActs.length === 0 && (
              <button
                onClick={loadDentalActs}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Charger les actes
              </button>
            )}
          </div>

          {dentalActs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sous-catégorie</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarif Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarif</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dentalActs.slice(0, 50).map((act) => (
                    <tr key={act.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{act.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{act.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{act.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{act.subcategory || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{act.tarif_level || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {act.tarif > 0 ? `${act.tarif.toLocaleString()} FCFA` : 'Sur devis'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dentalActs.length > 50 && (
                <p className="text-sm text-gray-500 mt-3 text-center">
                  Affichage des 50 premiers actes (total: {dentalActs.length})
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aucun acte importé. Importez votre fichier Excel ci-dessus.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ImportDentalActs;
