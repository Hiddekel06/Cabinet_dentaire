export const Footer = () => {
  return (
    <footer className="mt-12 pt-6 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
        <p>© 2026 Cabinet Dentaire. Tous droits réservés.</p>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <a href="#" className="hover:text-gray-700 transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-gray-700 transition-colors">Conditions</a>
          <a href="#" className="hover:text-gray-700 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
};
