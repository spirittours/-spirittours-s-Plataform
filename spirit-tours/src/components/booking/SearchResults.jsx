import React from 'react';

const SearchResults = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Resultados de Búsqueda</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Aquí irán los resultados */}
        <p>Mostrando resultados...</p>
      </div>
    </div>
  );
};

export default SearchResults;