import React, { useState } from 'react';
import api from '../services/api';

export default function LegalDocumentStatusToggle({ doc, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const nextStatus = !doc.isActive;
  const buttonLabel = doc.isActive ? 'Deactivate' : 'Activate';

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await api.patch(`/legal-documents/${doc.id}/status`, {
        isActive: nextStatus,
      });
      onStatusChange(response.data);
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || 'Failed to update document status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`btn ${doc.isActive ? 'btn-secondary' : 'btn-success'} btn-small`}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? `${buttonLabel}…` : buttonLabel}
    </button>
  );
}
