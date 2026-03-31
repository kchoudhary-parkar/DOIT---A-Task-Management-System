import React, { useState, useEffect } from "react";
import "./ProfileSections.css";
import { Pencil, Save } from 'lucide-react';

const PersonalInfo = ({ data, user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    mobile: "",
    address: "",
    city: "",
    country: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (data) {
      setFormData({
        mobile: data.mobile || "",
        address: data.address || "",
        city: data.city || "",
        country: data.country || ""
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
      setMessage({ type: "success", text: "Personal information updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update information" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-section personal-section">
      <div className="section-header">
        <div>
          <h2>Personal Information</h2>
          <p>Manage your personal details and contact information</p>
        </div>
        {!isEditing && (
          <button
            className="btn-edit"
            onClick={() => setIsEditing(true)}
            aria-label="Edit personal information"
          >
            <Pencil className="btn-icon-text" size={16} />
            Edit
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="personal-layout">
        <div className="personal-form-pane">
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={user?.name || ""}
                  disabled
                  className="form-input disabled"
                  aria-label="Full name (read-only)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="form-input disabled"
                  aria-label="Email address (read-only)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  id="mobile"
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  placeholder="+1 234 567 8900"
                  aria-label="Mobile number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  placeholder="e.g., United States"
                  aria-label="Country"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  rows="2"
                  placeholder="Street address, building number, etc."
                  aria-label="Address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  placeholder="e.g., New York"
                  aria-label="City"
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
                      mobile: data.mobile || "",
                      address: data.address || "",
                      city: data.city || "",
                      country: data.country || ""
                    });
                  }}
                  disabled={loading}
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={loading}
                  aria-label="Save changes"
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
        </div>

        {!isEditing && (
          <div className="personal-summary-pane">
            <div className="personal-summary-card">
              <div className="personal-summary-header">
                <div className="personal-summary-avatar">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="personal-summary-title">
                  <h4>{user?.name || "User"}</h4>
                  <p>{user?.email || "No email available"}</p>
                </div>
              </div>

              <div className="personal-summary-details">
                {formData.mobile && <span className="personal-detail-chip">Mobile: {formData.mobile}</span>}
                {formData.city && <span className="personal-detail-chip">City: {formData.city}</span>}
                {formData.country && <span className="personal-detail-chip">Country: {formData.country}</span>}
                {formData.address && <span className="personal-detail-chip personal-detail-chip-wide">Address: {formData.address}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfo;