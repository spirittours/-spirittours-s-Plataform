/**
 * Driver/Guide Profile Component
 * Perfil completo del conductor con geolocalización y verificación
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  photo: string;
  languages: Array<{
    language: string;
    level: 'basic' | 'intermediate' | 'fluent' | 'native';
  }>;
  rating: number;
  totalReviews: number;
  experience: string;
  certifications: string[];
  specialties: string[];
  contact: {
    phone?: string;
    whatsapp?: string;
    telegram?: string;
    email?: string;
  };
  vehicle?: {
    type: string;
    model: string;
    plate: string;
    color: string;
    capacity: number;
  };
  bio: string;
  verificationCode: string;
}

interface Location {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number;
}

interface Props {
  driver: Driver;
  currentLocation?: Location | null;
  showQRCode?: boolean;
  showContact?: boolean;
  showVehicle?: boolean;
  enableTracking?: boolean;
  onVerify?: (code: string) => void;
  estimatedArrival?: {
    minutes: number;
    distance: string;
  };
}

export const DriverProfileComponent: React.FC<Props> = ({
  driver,
  currentLocation = null,
  showQRCode = true,
  showContact = true,
  showVehicle = true,
  enableTracking = false,
  onVerify,
  estimatedArrival
}) => {
  const [verificationInput, setVerificationInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  const handleVerification = () => {
    if (verificationInput === driver.verificationCode) {
      setVerified(true);
      onVerify?.(verificationInput);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-lg ${
              star <= Math.floor(rating) ? 'text-yellow-400' :
              star <= rating ? 'text-yellow-200' :
              'text-gray-300'
            }`}
          >
            ⭐
          </span>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating.toFixed(1)} ({driver.totalReviews} reseñas)
        </span>
      </div>
    );
  };

  const getLanguageFlag = (language: string) => {
    const flags: Record<string, string> = {
      spanish: '🇪🇸',
      english: '🇬🇧',
      hebrew: '🇮🇱',
      arabic: '🇸🇦',
      french: '🇫🇷',
      german: '🇩🇪',
      italian: '🇮🇹',
      russian: '🇷🇺',
      chinese: '🇨🇳',
      japanese: '🇯🇵'
    };
    return flags[language.toLowerCase()] || '🌐';
  };

  const getLevelBadge = (level: string) => {
    const badges = {
      basic: { text: 'Básico', color: 'bg-gray-200 text-gray-700' },
      intermediate: { text: 'Intermedio', color: 'bg-blue-200 text-blue-700' },
      fluent: { text: 'Fluido', color: 'bg-green-200 text-green-700' },
      native: { text: 'Nativo', color: 'bg-purple-200 text-purple-700' }
    };
    return badges[level as keyof typeof badges] || badges.basic;
  };

  return (
    <div className="driver-profile bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
      {/* Header con foto y nombre */}
      <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 pb-20">
        {/* ETA Badge */}
        {estimatedArrival && enableTracking && (
          <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-lg">
            <div className="text-xs text-gray-600">Llega en</div>
            <div className="text-lg font-bold text-blue-600">
              {estimatedArrival.minutes} min
            </div>
            <div className="text-xs text-gray-500">{estimatedArrival.distance}</div>
          </div>
        )}

        {/* Estado de tracking */}
        {enableTracking && currentLocation && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            <span className="animate-pulse">🟢</span>
            <span>En camino</span>
          </div>
        )}
      </div>

      {/* Foto del conductor (sobrepuesta) */}
      <div className="relative -mt-16 px-6">
        <div className="flex items-end gap-4">
          <img
            src={driver.photo}
            alt={`${driver.firstName} ${driver.lastName}`}
            className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
          />
          <div className="flex-1 mb-2">
            <h2 className="text-2xl font-bold text-gray-800">
              {driver.firstName} {driver.lastName}
            </h2>
            {driver.nickname && (
              <p className="text-gray-600 italic">"{driver.nickname}"</p>
            )}
            {renderStars(driver.rating)}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Experiencia y certificaciones */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            👨‍💼 Experiencia y Certificaciones
          </h3>
          <p className="text-gray-600 mb-2">{driver.experience}</p>
          <div className="flex flex-wrap gap-2">
            {driver.certifications.map((cert, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                ✓ {cert}
              </span>
            ))}
          </div>
        </div>

        {/* Idiomas */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            🗣️ Idiomas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {driver.languages.map((lang, idx) => {
              const badge = getLevelBadge(lang.level);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getLanguageFlag(lang.language)}</span>
                    <span className="text-sm capitalize">{lang.language}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
                    {badge.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Especialidades */}
        {driver.specialties.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              🌟 Especialidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {driver.specialties.map((specialty, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Biografía */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            📝 Acerca de mí
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {showFullBio ? driver.bio : driver.bio.substring(0, 200) + '...'}
          </p>
          {driver.bio.length > 200 && (
            <button
              onClick={() => setShowFullBio(!showFullBio)}
              className="text-blue-600 text-sm mt-2 hover:underline"
            >
              {showFullBio ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>

        {/* Vehículo */}
        {showVehicle && driver.vehicle && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              🚗 Vehículo
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Tipo:</span>
                <p className="font-semibold">{driver.vehicle.type}</p>
              </div>
              <div>
                <span className="text-gray-600">Modelo:</span>
                <p className="font-semibold">{driver.vehicle.model}</p>
              </div>
              <div>
                <span className="text-gray-600">Color:</span>
                <p className="font-semibold">{driver.vehicle.color}</p>
              </div>
              <div>
                <span className="text-gray-600">Placa:</span>
                <p className="font-semibold">{driver.vehicle.plate}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Capacidad:</span>
                <p className="font-semibold">{driver.vehicle.capacity} pasajeros</p>
              </div>
            </div>
          </div>
        )}

        {/* Contacto */}
        {showContact && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              📞 Contacto
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {driver.contact.whatsapp && (
                <a
                  href={`https://wa.me/${driver.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </a>
              )}
              {driver.contact.telegram && (
                <a
                  href={`https://t.me/${driver.contact.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#0088CC] text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>✈️</span>
                  <span>Telegram</span>
                </a>
              )}
              {driver.contact.phone && (
                <a
                  href={`tel:${driver.contact.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>📱</span>
                  <span>Llamar</span>
                </a>
              )}
              {driver.contact.email && (
                <a
                  href={`mailto:${driver.contact.email}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>✉️</span>
                  <span>Email</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Verificación con QR */}
        {showQRCode && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
              🔒 Verificación de Conductor
            </h3>
            
            {!verified ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <QRCode
                      value={driver.verificationCode}
                      size={150}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Escanea el código QR o ingresa el PIN de seguridad</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ingresa el PIN"
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerification}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    Verificar
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    PIN de seguridad para el día de hoy:
                  </p>
                  <p className="text-2xl font-bold text-gray-700 tracking-wider">
                    {driver.verificationCode}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="inline-block p-4 bg-green-100 rounded-full mb-3">
                  <span className="text-5xl">✅</span>
                </div>
                <h4 className="text-lg font-bold text-green-700">
                  ¡Conductor Verificado!
                </h4>
                <p className="text-sm text-gray-600 mt-2">
                  Puedes abordar el vehículo con confianza
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ubicación actual */}
        {enableTracking && currentLocation && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              📍 Ubicación en Tiempo Real
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">Latitud:</span> {currentLocation.lat.toFixed(6)}
              </p>
              <p>
                <span className="font-medium">Longitud:</span> {currentLocation.lng.toFixed(6)}
              </p>
              <p>
                <span className="font-medium">Última actualización:</span>{' '}
                {currentLocation.timestamp.toLocaleTimeString()}
              </p>
              {currentLocation.accuracy && (
                <p>
                  <span className="font-medium">Precisión:</span> ±{currentLocation.accuracy}m
                </p>
              )}
            </div>
            <button className="mt-3 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Ver en mapa
            </button>
          </div>
        )}

        {/* Call to action */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">{driver.firstName}</span> está listo para
            brindarte la mejor experiencia
          </p>
          <p className="text-xs text-gray-600">
            ¡Disfruta tu tour con Spirit Tours! 🌟
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverProfileComponent;
