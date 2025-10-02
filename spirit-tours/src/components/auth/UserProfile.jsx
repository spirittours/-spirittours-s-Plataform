import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserProfile = () => {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Nombre: {user?.first_name} {user?.last_name}</p>
        <p>Email: {user?.email}</p>
      </div>
    </div>
  );
};

export default UserProfile;