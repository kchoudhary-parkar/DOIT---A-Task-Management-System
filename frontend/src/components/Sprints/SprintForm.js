import React, { useState } from "react";
import "./SprintForm.css";

const SprintForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.name.trim()) {
      setError("Sprint name is required");
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      setError("Start and end dates are required");
      return;
    }
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (endDate <= startDate) {
      setError("End date must be after start date");
      return;
    }
    
    // Convert to ISO format for backend
    const submitData = {
      name: formData.name.trim(),
      goal: formData.goal.trim(),
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };
    
    onSubmit(submitData);
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="sprint-form-overlay">
      <div className="sprint-form-container">
        <h2 className="sprint-form-title">Create New Sprint</h2>
        
        {error && <div className="sprint-form-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="sprint-form">
          <div className="form-group">
            <label htmlFor="name">Sprint Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sprint 1, Q1 2024 Sprint"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="goal">Sprint Goal</label>
            <textarea
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              placeholder="What do you want to achieve in this sprint?"
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date *</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                min={today}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="end_date">End Date *</label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date || today}
                required
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SprintForm;
