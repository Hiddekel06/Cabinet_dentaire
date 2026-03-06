import React, { useState, useMemo, useEffect } from "react";
import { Layout } from "../components/Layout";
import { productAPI, productTypeAPI } from "../services/api";

const Achats = () => {
  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [typesLoading, setTypesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showTotalAmount, setShowTotalAmount] = useState(false);
  const [quickForm, setQuickForm] = useState({
    type_id: '',
    name: '',
    quantity: 1,
    unit_price: '',
    purchase_date: '',
  });

  // Charger les types de produits
  const loadProductTypes = async () => {
    setTypesLoading(true);
    try {
      const { data } = await productTypeAPI.getAll();
      setProductTypes(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error('Erreur chargement types:', error);
    } finally {
      setTypesLoading(false);
    }
  };

  // Charger les produits
  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError('');
    try {
      const params = {};
      if (selectedType !== 'all') params.type_id = selectedType;
      if (searchTerm) params.search = searchTerm;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await productAPI.getAll(page, params);
      const list = Array.isArray(data?.data) ? data.data : [];
      const mapped = list.map((p) => ({
        apiId: p.id,
        id: p.id,
        type_id: p.type_id,
        type: p.type?.name || 'Type inconnu',
        name: p.name,
        quantity: p.quantity,
        unit_price: parseFloat(p.unit_price),
        total_amount: parseFloat(p.total_amount),
        purchase_date: p.purchase_date,
      }));
      setProducts(mapped);
      setTotalPages(data?.pagination?.last_page || 1);
      setTotalAmount(data?.total_amount || 0);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      setProductsError('Impossible de charger les achats.');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadProductTypes();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line
  }, [page, selectedType, searchTerm, startDate, endDate]);

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setQuickForm({
      type_id: product.type_id || '',
      name: product.name || '',
      quantity: product.quantity || 1,
      unit_price: product.unit_price || '',
      purchase_date: product.purchase_date || '',
    });
    setShowQuickCreate(true);
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'achat "${product.name}" ?`)) {
      try {
        if (product.apiId) {
          await productAPI.delete(product.apiId);
        }
        await loadProducts();
        if (selectedProduct?.id === product.id) {
          setShowDetailsModal(false);
          setSelectedProduct(null);
        }
      } catch (error) {
        console.error('Erreur suppression produit:', error);
        setProductsError('Impossible de supprimer le produit.');
      }
    }
  };

  const filteredProducts = useMemo(() => {
    let results = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(term)
      );
    }

    return results;
  }, [products, searchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleQuickCreateChange = (e) => {
    const { name, value } = e.target;
    setQuickForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickCreateSubmit = async (e) => {
    e.preventDefault();
    if (!quickForm.type_id || !quickForm.name || !quickForm.unit_price || !quickForm.purchase_date) return;

    setIsSubmitting(true);
    try {
      const payload = {
        type_id: Number(quickForm.type_id),
        name: quickForm.name,
        quantity: Number(quickForm.quantity),
        unit_price: parseFloat(quickForm.unit_price),
        purchase_date: quickForm.purchase_date,
      };

      if (editingProduct?.apiId) {
        const { data } = await productAPI.update(editingProduct.apiId, payload);
        // Optimistic update: mettre à jour le produit dans la liste
        setProducts(prev => prev.map(p => p.id === editingProduct.apiId ? {
          apiId: data.data.id,
          id: data.data.id,
          type_id: data.data.type_id,
          type: data.data.type?.name || 'Type inconnu',
          name: data.data.name,
          quantity: data.data.quantity,
          unit_price: parseFloat(data.data.unit_price),
          total_amount: parseFloat(data.data.total_amount),
          purchase_date: data.data.purchase_date,
        } : p));
      } else {
        const { data } = await productAPI.create(payload);
        // Optimistic update: ajouter le nouveau produit en haut de la liste
        const newProduct = {
          apiId: data.data.id,
          id: data.data.id,
          type_id: data.data.type_id,
          type: data.data.type?.name || 'Type inconnu',
          name: data.data.name,
          quantity: data.data.quantity,
          unit_price: parseFloat(data.data.unit_price),
          total_amount: parseFloat(data.data.total_amount),
          purchase_date: data.data.purchase_date,
        };
        setProducts(prev => [newProduct, ...prev]);
        // Mettre à jour le total
        setTotalAmount(prev => prev + newProduct.total_amount);
      }

      setShowQuickCreate(false);
      setEditingProduct(null);
      setQuickForm({
        type_id: '',
        name: '',
        quantity: 1,
        unit_price: '',
        purchase_date: '',
      });
    } catch (error) {
      console.error('Erreur création/modification:', error);
      setProductsError("Impossible d'enregistrer l'achat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(price);
  };

  return (
    <Layout>
      {showQuickCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setShowQuickCreate(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-lg border border-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowQuickCreate(false)}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>
            <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">{editingProduct ? 'Modifier l\'achat' : 'Nouvel achat'}</h3>
              <p className="text-sm text-gray-500 mt-1">Renseigner les détails du produit</p>
            </div>
            <form onSubmit={handleQuickCreateSubmit} className="px-6 py-4 grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Type de produit *</label>
                <select
                  name="type_id"
                  value={quickForm.type_id}
                  onChange={handleQuickCreateChange}
                  className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  required
                  disabled={typesLoading}
                >
                  <option value="">{typesLoading ? 'Chargement...' : 'Sélectionner un type'}</option>
                  {productTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Nom du produit *</label>
                <input
                  type="text"
                  name="name"
                  value={quickForm.name}
                  onChange={handleQuickCreateChange}
                  placeholder="Ex: Paracétamol 500mg"
                  className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Quantité *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={quickForm.quantity}
                    onChange={handleQuickCreateChange}
                    min="1"
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Prix unitaire *</label>
                  <input
                    type="number"
                    name="unit_price"
                    value={quickForm.unit_price}
                    onChange={handleQuickCreateChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Total estimé</label>
                  <input
                    type="text"
                    disabled
                    value={formatPrice(quickForm.quantity * (quickForm.unit_price || 0))}
                    className="mt-1 w-full bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Date d'achat *</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={quickForm.purchase_date}
                  onChange={handleQuickCreateChange}
                  className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSubmitting ? 'En cours...' : (editingProduct ? 'Mettre à jour' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-lg border border-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowDetailsModal(false)}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>
            <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Détails de l'achat</h3>
              <p className="text-sm text-gray-500 mt-1">Informations complètes</p>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-semibold text-gray-900">{selectedProduct.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Produit</span>
                <span className="text-sm font-semibold text-gray-900">{selectedProduct.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Quantité</span>
                <span className="text-sm font-semibold text-gray-900">{selectedProduct.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Prix unitaire</span>
                <span className="text-sm font-semibold text-gray-900">{formatPrice(selectedProduct.unit_price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-sm font-bold text-blue-600">{formatPrice(selectedProduct.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date d'achat</span>
                <span className="text-sm font-semibold text-gray-900">{new Date(selectedProduct.purchase_date).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des achats</h1>
          <p className="text-gray-600 mt-1">Consultez et gérez tous les achats du cabinet</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setQuickForm({
              type_id: '',
              name: '',
              quantity: 1,
              unit_price: '',
              purchase_date: '',
            });
            setShowQuickCreate(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvel achat
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom de produit..."
                className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm font-medium border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm hover:border-blue-400"
              style={{ minWidth: 170 }}
            >
              <option value="all">Tous les types</option>
              {productTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md bg-white shadow-sm hover:bg-gray-50 hover:border-blue-400 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Résumé des filtres et total */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
            <span>Total des achats:</span>
            <span className="text-lg">
              {showTotalAmount ? formatPrice(totalAmount) : '••••••••'}
            </span>
            <button
              onClick={() => setShowTotalAmount(!showTotalAmount)}
              className="p-1 hover:bg-blue-50 rounded-full transition-colors"
              title={showTotalAmount ? 'Masquer le montant' : 'Afficher le montant'}
            >
              {showTotalAmount ? (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des achats */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Achats</h2>
          <p className="text-gray-500 text-sm mt-1">Liste de tous les produits achetés</p>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-[600px] w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Produit</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Quantité</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">P.U.</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Total</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productsLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    Chargement des achats...
                  </td>
                </tr>
              ) : productsError ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-red-600">
                    {productsError}
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{new Date(p.purchase_date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{p.name}</td>
                    <td className="py-3 px-4 text-right">{p.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatPrice(p.unit_price)}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">{formatPrice(p.total_amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(p)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Voir détails"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Modifier"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">Aucun achat trouvé</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-gray-500 text-sm">
          Page {page} sur {totalPages} | Affichage de {products.length} achat{products.length !== 1 ? 's' : ''}
        </p>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← Précédent
          </button>
          <button
            className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg flex items-center gap-1"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <span>Suivant</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Achats;
