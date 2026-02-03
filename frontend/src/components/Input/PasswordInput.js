// src/components/Common/PasswordInput.jsx
import React, { useState, useEffect } from 'react';
import './PasswordIput.css';

const PasswordInput = ({ 
  value, 
  onChange, 
  placeholder = "Enter password",
  showStrength = true, 
  showRequirements = true,
  disabled = false,
  name = "password",
  id = "password"
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [requirements, setRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    noSpaces: true
  });
  const [strength, setStrength] = useState('');

  useEffect(() => {
    if (value) {
      validatePassword(value);
      calculateStrength(value);
    } else {
      setRequirements({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecial: false,
        noSpaces: true
      });
      setStrength('');
    }
  }, [value]);

  const validatePassword = (password) => {
    setRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password),
      noSpaces: !/\s/.test(password)
    });
  };

  const calculateStrength = (password) => {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) score += 2;
    
    const specialMatches = password.match(/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/g);
    if (specialMatches && specialMatches.length >= 2) score += 1;
    
    const numberMatches = password.match(/\d/g);
    if (numberMatches && numberMatches.length >= 3) score += 1;
    
    if (score <= 4) setStrength('weak');
    else if (score <= 7) setStrength('medium');
    else setStrength('strong');
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'strong': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case 'weak': return '33%';
      case 'medium': return '66%';
      case 'strong': return '100%';
      default: return '0%';
    }
  };

  const allRequirementsMet = Object.values(requirements).every(req => req === true);

  return (
    <div className="password-input-container">
      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          id={id}
          className={`password-input ${value ? (allRequirementsMet ? 'valid' : 'invalid') : ''}`}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="password-toggle"
          disabled={disabled}
          tabIndex={-1}
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      {showStrength && value && (
        <div className="password-strength">
          <div className="strength-header">
            <span className="strength-label">Password Strength</span>
            <span 
              className="strength-value" 
              style={{ color: getStrengthColor() }}
            >
              {strength.toUpperCase()}
            </span>
          </div>
          <div className="strength-bar">
            <div 
              className="strength-fill"
              style={{
                width: getStrengthWidth(),
                backgroundColor: getStrengthColor()
              }}
            />
          </div>
        </div>
      )}

      {showRequirements && (
        <div className="password-requirements">
          <div className="requirements-title">Password Requirements:</div>
          <div className="requirements-list">
            <RequirementItem 
              met={requirements.minLength} 
              text="At least 8 characters" 
            />
            <RequirementItem 
              met={requirements.hasUppercase} 
              text="One uppercase letter (A-Z)" 
            />
            <RequirementItem 
              met={requirements.hasLowercase} 
              text="One lowercase letter (a-z)" 
            />
            <RequirementItem 
              met={requirements.hasNumber} 
              text="One number (0-9)" 
            />
            <RequirementItem 
              met={requirements.hasSpecial} 
              text="One special character (!@#$%...)" 
            />
            <RequirementItem 
              met={requirements.noSpaces} 
              text="No spaces allowed" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

const RequirementItem = ({ met, text }) => (
  <div className={`requirement-item ${met ? 'met' : ''}`}>
    <span className="requirement-icon">
      {met ? '✓' : '○'}
    </span>
    <span className="requirement-text">{text}</span>
  </div>
);

export default PasswordInput;