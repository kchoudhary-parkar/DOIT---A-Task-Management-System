import React, { useState, useEffect } from "react";
import "./ProfileSections.css";
import { Pencil, Plus, Building2, Folder, Hash, Calendar, Mail, Save } from 'lucide-react';

const Organization = ({ data, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    employee_id: "",
    department: "",
    joinDate: "",
    workEmail: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || "",
        role: data.role || "",
        employee_id: data.employee_id || "",
        department: data.department || "",
        joinDate: data.joinDate || "",
        workEmail: data.workEmail || ""
      });
    }
  }, [data]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await onUpdate(formData);
      setMessage({ type: "success", text: "Organization details updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update organization details" });
    } finally {
      setLoading(false);
    }
  };

  const hasData = data && (data.name || data.role || data.employee_id);

  return (
    <div className="profile-section">
      <div className="section-header">
        <div>
          <h2>Organization</h2>
          <p>Add your current employment information</p>
        </div>
        {!isEditing && (
          <button
            className="btn-edit"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="btn-icon-text" size={16} />
            {hasData ? "Edit" : "Add Details"}
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {!isEditing && !hasData ? (
        <div className="empty-state">
          <Building2 className="empty-icon" size={80} />
          <p>No organization details added yet</p>
          <button className="btn-add-inline" onClick={() => setIsEditing(true)}>
            <Plus className="btn-icon-text" size={16} />
            Add organization details
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="name">Organization Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isEditing}
                className="form-input"
                placeholder="e.g., Tech Solutions Inc."
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role/Position *</label>
              <input
                id="role"
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={!isEditing}
                className="form-input"
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div className="form-group">
              <label htmlFor="employee_id">Employee ID</label>
              <input
                id="employee_id"
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                disabled={!isEditing}
                className="form-input"
                placeholder="EMP12345"
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={!isEditing}
                className="form-input"
                placeholder="e.g., Engineering, IT, HR"
              />
            </div>

            <div className="form-group">
              <label htmlFor="joinDate">Join Date</label>
              <input
                id="joinDate"
                type="month"
                name="joinDate"
                value={formData.joinDate}
                onChange={handleChange}
                disabled={!isEditing}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="workEmail">Work Email</label>
              <input
                id="workEmail"
                type="email"
                name="workEmail"
                value={formData.workEmail}
                onChange={handleChange}
                disabled={!isEditing}
                className="form-input"
                placeholder="you@company.com"
              />
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: data.name || "",
                    role: data.role || "",
                    employee_id: data.employee_id || "",
                    department: data.department || "",
                    joinDate: data.joinDate || "",
                    workEmail: data.workEmail || ""
                  });
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="btn-icon-text" size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}

      {!isEditing && hasData && (
        <div className="organization-summary">
          <div className="summary-card">
            <Building2 className="summary-icon" size={80} />
            <div className="summary-content">
              <h4>{formData.name}</h4>
              <p className="summary-role">{formData.role}</p>
              <div className="summary-details-wrapper">
                {formData.department && (
                  <span className="summary-detail"><Folder size={16} /> {formData.department}</span>
                )}
                {formData.employee_id && (
                  <span className="summary-detail"><Hash size={16} /> {formData.employee_id}</span>
                )}
                {formData.joinDate && (
                  <span className="summary-detail">
                    <Calendar size={16} /> Joined {new Date(formData.joinDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                )}
                {formData.workEmail && (
                  <span className="summary-detail"><Mail size={16} /> {formData.workEmail}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organization;