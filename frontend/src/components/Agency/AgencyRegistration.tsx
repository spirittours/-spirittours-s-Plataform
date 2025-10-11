import React, { useState } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Shield,
  DollarSign,
  Calendar,
  CreditCard,
  Briefcase,
  Users,
  Award,
  Lock,
  Camera,
  Signature,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

interface AgencyFormData {
  // Información de la Empresa
  companyName: string;
  commercialName: string;
  registrationNumber: string;
  taxId: string;
  businessType: 'agency' | 'tour_operator' | 'both';
  yearsInBusiness: number;
  iataNumber?: string;
  
  // Dirección
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Contacto Principal (Director/Dueño)
  owner: {
    fullName: string;
    position: string;
    email: string;
    phone: string;
    mobile: string;
    passportNumber: string;
    passportCountry: string;
    passportExpiry: string;
  };
  
  // Información Comercial
  commercial: {
    salesContactName: string;
    salesEmail: string;
    salesPhone: string;
    accountingEmail: string;
    operationsEmail: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
    };
  };
  
  // Información Financiera
  financial: {
    bankName: string;
    bankCountry: string;
    accountNumber: string;
    swiftCode?: string;
    creditLineRequested: number;
    paymentTermsAccepted: '7days' | '15days' | '30days' | 'prepayment';
    preferredCurrency: 'USD' | 'EUR' | 'MXN' | 'PEN' | 'COP';
    monthlyVolumeEstimate: string;
  };
  
  // Referencias Comerciales
  references: Array<{
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
    relationship: string;
  }>;
  
  // Documentos
  documents: {
    businessLicense?: File;
    taxRegistration?: File;
    ownerPassport?: File;
    ownerPhoto?: File;
    bankLetter?: File;
    insurancePolicy?: File;
    signedContract?: File;
    financialStatements?: File;
    iataLicense?: File;
  };
  
  // Términos y Condiciones
  agreements: {
    termsAccepted: boolean;
    paymentTermsAccepted: boolean;
    cancellationPolicyAccepted: boolean;
    dataProtectionAccepted: boolean;
    contractSigned: boolean;
    signatureDate?: string;
    ipAddress?: string;
  };
}

const AgencyRegistration: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AgencyFormData>({
    companyName: '',
    commercialName: '',
    registrationNumber: '',
    taxId: '',
    businessType: 'agency',
    yearsInBusiness: 0,
    iataNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    owner: {
      fullName: '',
      position: '',
      email: '',
      phone: '',
      mobile: '',
      passportNumber: '',
      passportCountry: '',
      passportExpiry: ''
    },
    commercial: {
      salesContactName: '',
      salesEmail: '',
      salesPhone: '',
      accountingEmail: '',
      operationsEmail: '',
      website: '',
      socialMedia: {
        facebook: '',
        instagram: '',
        linkedin: ''
      }
    },
    financial: {
      bankName: '',
      bankCountry: '',
      accountNumber: '',
      swiftCode: '',
      creditLineRequested: 0,
      paymentTermsAccepted: 'prepayment',
      preferredCurrency: 'USD',
      monthlyVolumeEstimate: ''
    },
    references: [
      {
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        relationship: ''
      }
    ],
    documents: {},
    agreements: {
      termsAccepted: false,
      paymentTermsAccepted: false,
      cancellationPolicyAccepted: false,
      dataProtectionAccepted: false,
      contractSigned: false
    }
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateStep = (stepNumber: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (stepNumber) {
      case 1:
        if (!formData.companyName) errors.companyName = 'Nombre de empresa requerido';
        if (!formData.taxId) errors.taxId = 'RUC/Tax ID requerido';
        if (!formData.businessType) errors.businessType = 'Tipo de negocio requerido';
        break;
      case 2:
        if (!formData.owner.fullName) errors.ownerName = 'Nombre del director requerido';
        if (!formData.owner.email) errors.ownerEmail = 'Email del director requerido';
        if (!formData.owner.passportNumber) errors.passport = 'Número de pasaporte requerido';
        break;
      case 3:
        if (!formData.commercial.salesEmail) errors.salesEmail = 'Email de ventas requerido';
        if (!formData.commercial.accountingEmail) errors.accountingEmail = 'Email de contabilidad requerido';
        break;
      case 4:
        if (!formData.financial.bankName) errors.bankName = 'Nombre del banco requerido';
        if (!formData.financial.accountNumber) errors.accountNumber = 'Número de cuenta requerido';
        if (formData.financial.creditLineRequested > 0 && !formData.financial.monthlyVolumeEstimate) {
          errors.monthlyVolume = 'Volumen mensual estimado requerido para línea de crédito';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleFileUpload = (documentType: keyof typeof formData.documents, file: File) => {
    // Validar tamaño del archivo (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar los 10MB');
      return;
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos PDF, JPG o PNG');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: file
      }
    }));
    
    setUploadedDocuments(prev => ({ ...prev, [documentType]: true }));
  };

  const handleSubmit = async () => {
    // Validar todos los pasos
    for (let i = 1; i <= 6; i++) {
      if (!validateStep(i)) {
        alert(`Por favor complete todos los campos requeridos en el paso ${i}`);
        setStep(i);
        return;
      }
    }
    
    // Validar documentos obligatorios
    const requiredDocs = ['businessLicense', 'taxRegistration', 'ownerPassport', 'signedContract'];
    const missingDocs = requiredDocs.filter(doc => !uploadedDocuments[doc]);
    
    if (missingDocs.length > 0) {
      alert('Por favor cargue todos los documentos obligatorios');
      setStep(5);
      return;
    }
    
    // Validar acuerdos
    if (!formData.agreements.termsAccepted || !formData.agreements.paymentTermsAccepted) {
      alert('Debe aceptar todos los términos y condiciones');
      setStep(6);
      return;
    }
    
    // Enviar formulario
    try {
      const response = await fetch('/api/agencies/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert('Registro enviado exitosamente. Recibirá una respuesta en 24-48 horas.');
        // Redirigir o limpiar formulario
      }
    } catch (error) {
      alert('Error al enviar el registro. Por favor intente nuevamente.');
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8">
      {[1, 2, 3, 4, 5, 6].map((stepNum) => (
        <div
          key={stepNum}
          className={`flex-1 text-center ${stepNum < 6 ? 'border-r border-gray-300' : ''}`}
        >
          <div
            className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= stepNum
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-white border-gray-300 text-gray-500'
            }`}
          >
            {step > stepNum ? <CheckCircle className="h-5 w-5" /> : stepNum}
          </div>
          <p className="text-xs mt-2">
            {stepNum === 1 && 'Empresa'}
            {stepNum === 2 && 'Director'}
            {stepNum === 3 && 'Contacto'}
            {stepNum === 4 && 'Financiero'}
            {stepNum === 5 && 'Documentos'}
            {stepNum === 6 && 'Contrato'}
          </p>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center">
        <Building2 className="h-6 w-6 mr-2 text-blue-500" />
        Información de la Empresa
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Razón Social *
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.companyName ? 'border-red-500' : ''
            }`}
            placeholder="Nombre legal de la empresa"
          />
          {validationErrors.companyName && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.companyName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Comercial
          </label>
          <input
            type="text"
            value={formData.commercialName}
            onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nombre comercial (si es diferente)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RUC / Tax ID *
          </label>
          <input
            type="text"
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.taxId ? 'border-red-500' : ''
            }`}
            placeholder="Número de identificación fiscal"
          />
          {validationErrors.taxId && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.taxId}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Registro
          </label>
          <input
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Número de registro empresarial"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Negocio *
          </label>
          <select
            value={formData.businessType}
            onChange={(e) => setFormData({ ...formData, businessType: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="agency">Agencia de Viajes</option>
            <option value="tour_operator">Tour Operador</option>
            <option value="both">Agencia y Tour Operador</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Años en el Negocio
          </label>
          <input
            type="number"
            value={formData.yearsInBusiness}
            onChange={(e) => setFormData({ ...formData, yearsInBusiness: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Años de experiencia"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número IATA (si aplica)
          </label>
          <input
            type="text"
            value={formData.iataNumber}
            onChange={(e) => setFormData({ ...formData, iataNumber: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Código IATA"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-gray-500" />
          Dirección de la Empresa
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Dirección completa"
            />
          </div>
          
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, city: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ciudad"
          />
          
          <input
            type="text"
            value={formData.address.state}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, state: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Estado/Provincia"
          />
          
          <input
            type="text"
            value={formData.address.country}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, country: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="País"
          />
          
          <input
            type="text"
            value={formData.address.postalCode}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, postalCode: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Código Postal"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center">
        <User className="h-6 w-6 mr-2 text-blue-500" />
        Información del Director/Propietario
      </h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Esta información es obligatoria para verificar la identidad del responsable legal de la empresa
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Completo *
          </label>
          <input
            type="text"
            value={formData.owner.fullName}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, fullName: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.ownerName ? 'border-red-500' : ''
            }`}
            placeholder="Nombre como aparece en el pasaporte"
          />
          {validationErrors.ownerName && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.ownerName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cargo en la Empresa *
          </label>
          <select
            value={formData.owner.position}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, position: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Seleccione...</option>
            <option value="CEO">CEO / Director General</option>
            <option value="President">Presidente</option>
            <option value="Owner">Propietario</option>
            <option value="Managing Director">Director Gerente</option>
            <option value="General Manager">Gerente General</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Pasaporte *
          </label>
          <input
            type="text"
            value={formData.owner.passportNumber}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, passportNumber: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.passport ? 'border-red-500' : ''
            }`}
            placeholder="Número de pasaporte"
          />
          {validationErrors.passport && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.passport}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            País Emisor del Pasaporte *
          </label>
          <input
            type="text"
            value={formData.owner.passportCountry}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, passportCountry: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="País"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Vencimiento del Pasaporte *
          </label>
          <input
            type="date"
            value={formData.owner.passportExpiry}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, passportExpiry: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Corporativo *
          </label>
          <input
            type="email"
            value={formData.owner.email}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, email: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.ownerEmail ? 'border-red-500' : ''
            }`}
            placeholder="email@empresa.com"
          />
          {validationErrors.ownerEmail && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.ownerEmail}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono Fijo
          </label>
          <input
            type="tel"
            value={formData.owner.phone}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, phone: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="+1 234 567 8900"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono Móvil *
          </label>
          <input
            type="tel"
            value={formData.owner.mobile}
            onChange={(e) => setFormData({
              ...formData,
              owner: { ...formData.owner, mobile: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="+1 234 567 8900"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center">
        <Phone className="h-6 w-6 mr-2 text-blue-500" />
        Información de Contacto Comercial
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Contacto de Ventas *
          </label>
          <input
            type="text"
            value={formData.commercial.salesContactName}
            onChange={(e) => setFormData({
              ...formData,
              commercial: { ...formData.commercial, salesContactName: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nombre del responsable de ventas"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email de Ventas *
          </label>
          <input
            type="email"
            value={formData.commercial.salesEmail}
            onChange={(e) => setFormData({
              ...formData,
              commercial: { ...formData.commercial, salesEmail: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.salesEmail ? 'border-red-500' : ''
            }`}
            placeholder="ventas@empresa.com"
          />
          {validationErrors.salesEmail && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.salesEmail}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono de Ventas
          </label>
          <input
            type="tel"
            value={formData.commercial.salesPhone}
            onChange={(e) => setFormData({
              ...formData,
              commercial: { ...formData.commercial, salesPhone: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="+1 234 567 8900"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email de Contabilidad *
          </label>
          <input
            type="email"
            value={formData.commercial.accountingEmail}
            onChange={(e) => setFormData({
              ...formData,
              commercial: { ...formData.commercial, accountingEmail: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.accountingEmail ? 'border-red-500' : ''
            }`}
            placeholder="contabilidad@empresa.com"
          />
          {validationErrors.accountingEmail && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.accountingEmail}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email de Operaciones
          </label>
          <input
            type="email"
            value={formData.commercial.operationsEmail}
            onChange={(e) => setFormData({
              ...formData,
              commercial: { ...formData.commercial, operationsEmail: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="operaciones@empresa.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sitio Web
          </label>
          <input
            type="url"
            value={formData.commercial.website}
            onChange={(e) => setFormData({
              ...formData,
              commercial: { ...formData.commercial, website: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="https://www.empresa.com"
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Redes Sociales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="url"
            value={formData.commercial.socialMedia?.facebook}
            onChange={(e) => setFormData({
              ...formData,
              commercial: {
                ...formData.commercial,
                socialMedia: { ...formData.commercial.socialMedia, facebook: e.target.value }
              }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Facebook URL"
          />
          
          <input
            type="url"
            value={formData.commercial.socialMedia?.instagram}
            onChange={(e) => setFormData({
              ...formData,
              commercial: {
                ...formData.commercial,
                socialMedia: { ...formData.commercial.socialMedia, instagram: e.target.value }
              }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Instagram URL"
          />
          
          <input
            type="url"
            value={formData.commercial.socialMedia?.linkedin}
            onChange={(e) => setFormData({
              ...formData,
              commercial: {
                ...formData.commercial,
                socialMedia: { ...formData.commercial.socialMedia, linkedin: e.target.value }
              }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="LinkedIn URL"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center">
        <DollarSign className="h-6 w-6 mr-2 text-blue-500" />
        Información Financiera y Comercial
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Banco *
          </label>
          <input
            type="text"
            value={formData.financial.bankName}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, bankName: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.bankName ? 'border-red-500' : ''
            }`}
            placeholder="Nombre del banco"
          />
          {validationErrors.bankName && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.bankName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            País del Banco *
          </label>
          <input
            type="text"
            value={formData.financial.bankCountry}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, bankCountry: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="País"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Cuenta *
          </label>
          <input
            type="text"
            value={formData.financial.accountNumber}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, accountNumber: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.accountNumber ? 'border-red-500' : ''
            }`}
            placeholder="Número de cuenta"
          />
          {validationErrors.accountNumber && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.accountNumber}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código SWIFT/BIC
          </label>
          <input
            type="text"
            value={formData.financial.swiftCode}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, swiftCode: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Código SWIFT"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Moneda Preferida *
          </label>
          <select
            value={formData.financial.preferredCurrency}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, preferredCurrency: e.target.value as any }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="USD">USD - Dólar Americano</option>
            <option value="EUR">EUR - Euro</option>
            <option value="MXN">MXN - Peso Mexicano</option>
            <option value="PEN">PEN - Sol Peruano</option>
            <option value="COP">COP - Peso Colombiano</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Términos de Pago Solicitados *
          </label>
          <select
            value={formData.financial.paymentTermsAccepted}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, paymentTermsAccepted: e.target.value as any }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="prepayment">Prepago</option>
            <option value="7days">7 días</option>
            <option value="15days">15 días</option>
            <option value="30days">30 días</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Línea de Crédito Solicitada (USD)
          </label>
          <input
            type="number"
            value={formData.financial.creditLineRequested}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, creditLineRequested: parseFloat(e.target.value) }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Dejar en 0 si solo trabajará con prepago
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Volumen Mensual Estimado (USD)
          </label>
          <input
            type="text"
            value={formData.financial.monthlyVolumeEstimate}
            onChange={(e) => setFormData({
              ...formData,
              financial: { ...formData.financial, monthlyVolumeEstimate: e.target.value }
            })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.monthlyVolume ? 'border-red-500' : ''
            }`}
            placeholder="Ej: 10000-50000"
          />
          {validationErrors.monthlyVolume && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.monthlyVolume}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Referencias Comerciales</h3>
        <p className="text-sm text-gray-600">
          Proporcione al menos 2 referencias comerciales (proveedores, clientes, partners)
        </p>
        
        {formData.references.map((ref, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Referencia #{index + 1}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={ref.companyName}
                onChange={(e) => {
                  const newRefs = [...formData.references];
                  newRefs[index].companyName = e.target.value;
                  setFormData({ ...formData, references: newRefs });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Nombre de la empresa"
              />
              
              <input
                type="text"
                value={ref.contactPerson}
                onChange={(e) => {
                  const newRefs = [...formData.references];
                  newRefs[index].contactPerson = e.target.value;
                  setFormData({ ...formData, references: newRefs });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Persona de contacto"
              />
              
              <input
                type="tel"
                value={ref.phone}
                onChange={(e) => {
                  const newRefs = [...formData.references];
                  newRefs[index].phone = e.target.value;
                  setFormData({ ...formData, references: newRefs });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Teléfono"
              />
              
              <input
                type="email"
                value={ref.email}
                onChange={(e) => {
                  const newRefs = [...formData.references];
                  newRefs[index].email = e.target.value;
                  setFormData({ ...formData, references: newRefs });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Email"
              />
              
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={ref.relationship}
                  onChange={(e) => {
                    const newRefs = [...formData.references];
                    newRefs[index].relationship = e.target.value;
                    setFormData({ ...formData, references: newRefs });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Tipo de relación (proveedor, cliente, socio, etc.)"
                />
              </div>
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => setFormData({
            ...formData,
            references: [...formData.references, {
              companyName: '',
              contactPerson: '',
              phone: '',
              email: '',
              relationship: ''
            }]
          })}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          + Agregar Otra Referencia
        </button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center">
        <FileText className="h-6 w-6 mr-2 text-blue-500" />
        Documentación Requerida
      </h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Todos los documentos deben ser legibles y estar vigentes. Formatos aceptados: PDF, JPG, PNG (máx. 10MB)
        </p>
      </div>
      
      <div className="space-y-4">
        {[
          { 
            key: 'businessLicense', 
            label: 'Licencia de Negocio / Registro Comercial', 
            required: true,
            description: 'Documento oficial que acredite la existencia legal de la empresa'
          },
          { 
            key: 'taxRegistration', 
            label: 'Registro Tributario / RUC', 
            required: true,
            description: 'Certificado de inscripción en el registro tributario'
          },
          { 
            key: 'ownerPassport', 
            label: 'Copia del Pasaporte del Director/Propietario', 
            required: true,
            description: 'Página con foto y datos personales'
          },
          { 
            key: 'ownerPhoto', 
            label: 'Foto del Director sosteniendo su Pasaporte', 
            required: false,
            description: 'Para verificación adicional de identidad'
          },
          { 
            key: 'bankLetter', 
            label: 'Carta de Referencia Bancaria', 
            required: false,
            description: 'Carta del banco confirmando la cuenta'
          },
          { 
            key: 'insurancePolicy', 
            label: 'Póliza de Seguro de Responsabilidad', 
            required: false,
            description: 'Si aplica para su tipo de negocio'
          },
          { 
            key: 'signedContract', 
            label: 'Contrato Firmado con Spirit Tours', 
            required: true,
            description: 'Descargar plantilla, firmar y subir'
          },
          { 
            key: 'financialStatements', 
            label: 'Estados Financieros (último año)', 
            required: false,
            description: 'Solo si solicita línea de crédito'
          },
          { 
            key: 'iataLicense', 
            label: 'Licencia IATA', 
            required: false,
            description: 'Si declaró tener número IATA'
          }
        ].map((doc) => (
          <div key={doc.key} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium flex items-center">
                  {doc.label}
                  {doc.required && <span className="text-red-500 ml-1">*</span>}
                  {uploadedDocuments[doc.key] && (
                    <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                  )}
                </h4>
                <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
              </div>
              <div className="ml-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(doc.key as keyof typeof formData.documents, e.target.files[0]);
                      }
                    }}
                  />
                  <div className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadedDocuments[doc.key] ? 'Cambiar' : 'Subir'}
                  </div>
                </label>
              </div>
            </div>
            {uploadedDocuments[doc.key] && formData.documents[doc.key as keyof typeof formData.documents] && (
              <p className="text-sm text-green-600 mt-2">
                ✅ {formData.documents[doc.key as keyof typeof formData.documents]?.name}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {step === 5 && (
        <div className="mt-4">
          <button
            onClick={() => window.open('/templates/spirit-tours-agency-contract.pdf', '_blank')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <Download className="h-4 w-4 inline mr-2" />
            Descargar Plantilla de Contrato
          </button>
        </div>
      )}
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center">
        <Shield className="h-6 w-6 mr-2 text-blue-500" />
        Términos, Condiciones y Firma del Contrato
      </h2>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">Acuerdo de Colaboración Comercial</h3>
        
        <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
          <p>
            Al registrarse como agencia asociada de Spirit Tours, usted acepta los siguientes términos:
          </p>
          
          <div className="space-y-2">
            <h4 className="font-medium">1. Compromiso de Pago</h4>
            <p>
              La agencia se compromete a pagar el 100% de todas las reservas confirmadas a través del sistema 
              de Spirit Tours, según los términos de pago acordados.
            </p>
            
            <h4 className="font-medium">2. Políticas de Cancelación</h4>
            <p>
              Las cancelaciones se regirán por las políticas establecidas para cada servicio. 
              La agencia es responsable de comunicar estas políticas a sus clientes finales.
            </p>
            
            <h4 className="font-medium">3. Comisiones</h4>
            <p>
              Las comisiones serán acordadas según el volumen de ventas y el tipo de servicios. 
              Las tarifas netas y comisionables serán claramente identificadas en el sistema.
            </p>
            
            <h4 className="font-medium">4. Responsabilidad</h4>
            <p>
              La agencia asume total responsabilidad por la información proporcionada a sus clientes 
              y por el cumplimiento de las regulaciones locales en su país de operación.
            </p>
            
            <h4 className="font-medium">5. Protección de Datos</h4>
            <p>
              Ambas partes se comprometen a proteger la información confidencial y los datos personales 
              según las leyes de protección de datos aplicables.
            </p>
          </div>
        </div>
        
        <div className="border-t pt-4 space-y-3">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreements.termsAccepted}
              onChange={(e) => setFormData({
                ...formData,
                agreements: { ...formData.agreements, termsAccepted: e.target.checked }
              })}
              className="mt-1 mr-3"
            />
            <span className="text-sm">
              He leído y acepto los <a href="#" className="text-blue-500 underline">Términos y Condiciones</a> de Spirit Tours
            </span>
          </label>
          
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreements.paymentTermsAccepted}
              onChange={(e) => setFormData({
                ...formData,
                agreements: { ...formData.agreements, paymentTermsAccepted: e.target.checked }
              })}
              className="mt-1 mr-3"
            />
            <span className="text-sm">
              Me comprometo a pagar todas las reservas confirmadas según los términos acordados
            </span>
          </label>
          
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreements.cancellationPolicyAccepted}
              onChange={(e) => setFormData({
                ...formData,
                agreements: { ...formData.agreements, cancellationPolicyAccepted: e.target.checked }
              })}
              className="mt-1 mr-3"
            />
            <span className="text-sm">
              Acepto las <a href="#" className="text-blue-500 underline">Políticas de Cancelación</a> establecidas
            </span>
          </label>
          
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.agreements.dataProtectionAccepted}
              onChange={(e) => setFormData({
                ...formData,
                agreements: { ...formData.agreements, dataProtectionAccepted: e.target.checked }
              })}
              className="mt-1 mr-3"
            />
            <span className="text-sm">
              Acepto la <a href="#" className="text-blue-500 underline">Política de Protección de Datos</a> y privacidad
            </span>
          </label>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium flex items-center text-yellow-800 mb-2">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Firma Digital del Contrato
        </h4>
        <p className="text-sm text-yellow-700 mb-3">
          Al hacer clic en "Firmar y Enviar Solicitud", usted firma digitalmente este contrato 
          y confirma que toda la información proporcionada es verídica y exacta.
        </p>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date().toLocaleDateString()}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Globe className="h-4 w-4 mr-1" />
            IP: {/* Se capturaría la IP real */}
            192.168.1.1
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Lock className="h-4 w-4 mr-1" />
            Conexión Segura SSL
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 text-center">
              Registro de Agencia / Tour Operador
            </h1>
            <p className="text-center text-gray-600 mt-2">
              Complete el formulario para convertirse en socio comercial de Spirit Tours
            </p>
          </div>
          
          {renderStepIndicator()}
          
          <form onSubmit={(e) => e.preventDefault()}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && renderStep6()}
            
            <div className="flex justify-between mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Anterior
                </button>
              )}
              
              {step < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ml-auto"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 ml-auto flex items-center"
                  disabled={!formData.agreements.termsAccepted || !formData.agreements.paymentTermsAccepted}
                >
                  <Signature className="h-5 w-5 mr-2" />
                  Firmar y Enviar Solicitud
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>¿Necesita ayuda? Contáctenos:</p>
          <p>📧 agencies@spirittours.com | 📱 WhatsApp: +51 999 999 999</p>
        </div>
      </div>
    </div>
  );
};

export default AgencyRegistration;