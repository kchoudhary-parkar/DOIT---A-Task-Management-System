import React, { useState } from "react";
import "./ProfileSections.css";
import { Plus, Award, Pencil, Trash2, Calendar, Hash, ExternalLink, Save } from 'lucide-react';

const Certificates = ({ data, onUpdate }) => {
  const [certificatesList, setCertificatesList] = useState(data || []);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    issuedBy: "",
    issueDate: "",
    credentialId: "",
    credentialUrl: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      let updated;
      if (editingIndex !== null) {
        updated = [...certificatesList];
        updated[editingIndex] = formData;
      } else {
        updated = [...certificatesList, formData];
      }

      await onUpdate(updated);
      setCertificatesList(updated);
      setMessage({ type: "success", text: "Certificate saved successfully!" });
      resetForm();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to save certificate" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    setFormData(certificatesList[index]);
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;

    try {
      const updated = certificatesList.filter((_, i) => i !== index);
      await onUpdate(updated);
      setCertificatesList(updated);
      setMessage({ type: "success", text: "Certificate deleted!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to delete certificate" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      issuedBy: "",
      issueDate: "",
      credentialId: "",
      credentialUrl: ""
    });
    setShowForm(false);
    setEditingIndex(null);
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div>
          <h2>Certificates</h2>
          <p>Add your professional certifications and achievements</p>
        </div>
        {!showForm && (
          <button className="btn-add" onClick={() => setShowForm(true)}>
            <Plus className="btn-icon-text" size={16} />
            Add Certificate
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="profile-form">
          <h3>{editingIndex !== null ? "Edit Certificate" : "Add New Certificate"}</h3>
          
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="name">Certificate Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., AWS Certified Solutions Architect"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="issuedBy">Issued By *</label>
              <input
                id="issuedBy"
                type="text"
                name="issuedBy"
                value={formData.issuedBy}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Amazon Web Services"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="issueDate">Issue Date *</label>
              <input
                id="issueDate"
                type="month"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="credentialId">Credential ID</label>
              <input
                id="credentialId"
                type="text"
                name="credentialId"
                value={formData.credentialId}
                onChange={handleChange}
                className="form-input"
                placeholder="Certificate ID or License Number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="credentialUrl">Credential URL</label>
              <input
                id="credentialUrl"
                type="url"
                name="credentialUrl"
                value={formData.credentialUrl}
                onChange={handleChange}
                className="form-input"
                placeholder="https://verify.certificate.com/..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={resetForm}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="btn-icon-text" size={16} />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="certificates-list">
        {certificatesList.length === 0 ? (
          <div className="empty-state">
            <Award className="empty-icon" size={80} />
            <p>No certificates added yet</p>
            <button className="btn-add-inline" onClick={() => setShowForm(true)}>
              <Plus className="btn-icon-text" size={16} />
              Add your first certificate
            </button>
          </div>
        ) : (
          certificatesList.map((cert, index) => (
            <div key={index} className="certificate-card">
              <div className="card-header">
                <Award className="card-icon" size={24} />
                <div className="card-title">
                  <h4>{cert.name}</h4>
                  <span className="card-issuer">{cert.issuedBy}</span>
                </div>
                <div className="card-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(index)}
                    title="Edit"
                    aria-label={`Edit ${cert.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDelete(index)}
                    title="Delete"
                    aria-label={`Delete ${cert.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <p className="issue-date">
                  <Calendar size={16} /> Issued: {new Date(cert.issueDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
                {cert.credentialId && (
                  <p className="credential-id"><Hash size={16} /> Credential ID: {cert.credentialId}</p>
                )}
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="credential-link"
                  >
                    <ExternalLink size={16} /> Verify Certificate
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Certificates;