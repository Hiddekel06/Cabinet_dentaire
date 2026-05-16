import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Composant de contrôle d'accès basé sur les rôles.
 * 
 * @param {string|string[]} roles - Le ou les rôles autorisés (ex: "admin" ou ["admin", "secretary"])
 * @param {React.ReactNode} children - Le contenu à afficher si autorisé
 * @param {React.ReactNode} fallback - Le contenu à afficher si non autorisé (optionnel)
 */
export const Can = ({ roles, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user || !user.role) {
    return fallback;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  return fallback;
};

/**
 * Hook utilitaire pour vérifier les permissions dans le code logique (hors JSX).
 */
export const usePermission = () => {
  const { user } = useAuth();

  const can = (roles) => {
    if (!user || !user.role) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };

  return { can, role: user?.role };
};
