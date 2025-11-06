/**
 * Form Block Component
 * Customizable contact/lead forms
 */

import React, { useState } from 'react';
import { FaPlus, FaTrash, FaPaperPlane } from 'react-icons/fa';

const FormBlock = ({ content, settings, onChange, onSettingsChange, isEditing }) => {
  const defaultContent = {
    title: content?.title || 'Contact Us',
    description: content?.description || 'Fill out the form below and we will get back to you.',
    submitButtonText: content?.submitButtonText || 'Submit',
    successMessage: content?.successMessage || 'Thank you! Your message has been sent.',
    fields: content?.fields || [
      { id: '1', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: '2', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
      { id: '3', type: 'textarea', label: 'Message', placeholder: 'Your message...', required: true },
    ],
  };

  const defaultSettings = {
    layout: settings?.layout || 'stacked', // stacked, inline
    submitAction: settings?.submitAction || 'email', // email, webhook, database
    submitEmail: settings?.submitEmail || '',
    webhookUrl: settings?.webhookUrl || '',
  };

  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleContentChange = (key, value) => {
    onChange?.({ ...defaultContent, [key]: value });
  };

  const handleSettingChange = (key, value) => {
    onSettingsChange?.({ ...defaultSettings, [key]: value });
  };

  const addField = () => {
    const newField = {
      id: Date.now().toString(),
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
    };
    handleContentChange('fields', [...defaultContent.fields, newField]);
  };

  const updateField = (id, field, value) => {
    const updatedFields = defaultContent.fields.map((f) =>
      f.id === id ? { ...f, [field]: value } : f
    );
    handleContentChange('fields', updatedFields);
  };

  const removeField = (id) => {
    const updatedFields = defaultContent.fields.filter((f) => f.id !== id);
    handleContentChange('fields', updatedFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // In preview/production, this would actually submit the form
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Form Header */}
        <div>
          <label className="block text-sm font-medium mb-2">Form Title</label>
          <input
            type="text"
            value={defaultContent.title}
            onChange={(e) => handleContentChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={defaultContent.description}
            onChange={(e) => handleContentChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium">Form Fields</label>
            <button
              onClick={addField}
              className="btn btn-sm btn-secondary flex items-center"
            >
              <FaPlus className="mr-1" /> Add Field
            </button>
          </div>

          {defaultContent.fields.map((field, index) => (
            <div key={field.id} className="border border-gray-300 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                <button
                  onClick={() => removeField(field.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(field.id, 'label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder}
                    onChange={(e) => updateField(field.id, 'placeholder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-xs">Required</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Submit Button Text</label>
            <input
              type="text"
              value={defaultContent.submitButtonText}
              onChange={(e) => handleContentChange('submitButtonText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Layout</label>
            <select
              value={defaultSettings.layout}
              onChange={(e) => handleSettingChange('layout', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="stacked">Stacked</option>
              <option value="inline">Inline (2 columns)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Success Message</label>
          <input
            type="text"
            value={defaultContent.successMessage}
            onChange={(e) => handleContentChange('successMessage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Submit Action Settings */}
        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium mb-2">Submit Action</label>
          <select
            value={defaultSettings.submitAction}
            onChange={(e) => handleSettingChange('submitAction', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
          >
            <option value="email">Send Email</option>
            <option value="webhook">Call Webhook</option>
            <option value="database">Save to Database</option>
          </select>

          {defaultSettings.submitAction === 'email' && (
            <div>
              <label className="block text-xs font-medium mb-1">Send To Email</label>
              <input
                type="email"
                value={defaultSettings.submitEmail}
                onChange={(e) => handleSettingChange('submitEmail', e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {defaultSettings.submitAction === 'webhook' && (
            <div>
              <label className="block text-xs font-medium mb-1">Webhook URL</label>
              <input
                type="url"
                value={defaultSettings.webhookUrl}
                onChange={(e) => handleSettingChange('webhookUrl', e.target.value)}
                placeholder="https://api.example.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Preview mode
  const layoutClass = defaultSettings.layout === 'inline' ? 'grid grid-cols-2 gap-4' : 'space-y-4';

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {defaultContent.title && (
          <h2 className="text-2xl font-bold mb-2">{defaultContent.title}</h2>
        )}
        {defaultContent.description && (
          <p className="text-gray-600 mb-6">{defaultContent.description}</p>
        )}

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-medium">{defaultContent.successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={layoutClass}>
            {defaultContent.fields.map((field) => (
              <div key={field.id} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      required={field.required}
                      checked={formData[field.id] || false}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">{field.placeholder || 'Check this box'}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}

            <div className="col-span-2">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <FaPaperPlane className="mr-2" />
                {defaultContent.submitButtonText}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FormBlock;
