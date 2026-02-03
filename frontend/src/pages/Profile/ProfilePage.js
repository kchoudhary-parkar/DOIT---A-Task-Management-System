import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { profileAPI } from "../../services/api";
import PersonalInfo from "../../components/Profile/PersonalInfo";
import Education from "../../components/Profile/Education";
import Certificates from "../../components/Profile/Certificates";
import Organization from "../../components/Profile/Organization";
import Loader from "../../components/Loader/Loader";
import { User, GraduationCap, Award, Building2, Mail } from 'lucide-react';
import "./ProfilePage.css";

const ProfilePage = () => {
  const { user } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState("personal");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (profileData) {
      calculateCompletion();
    }
  }, [profileData]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const data = await profileAPI.getProfile();
      setProfileData(data.profile || {});
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      // Initialize empty profile if none exists
      setProfileData({
        personal: {},
        education: [],
        certificates: [],
        organization: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = () => {
    let totalFields = 0;
    let filledFields = 0;

    // Personal info fields (4 fields)
    const personal = profileData.personal || {};
    totalFields += 4;
    if (personal.mobile) filledFields++;
    if (personal.address) filledFields++;
    if (personal.city) filledFields++;
    if (personal.country) filledFields++;

    // Education (min 1 entry expected)
    totalFields += 3;
    const education = profileData.education || [];
    if (education.length > 0) filledFields += 3;

    // Certificates (min 1 expected)
    totalFields += 2;
    const certificates = profileData.certificates || [];
    if (certificates.length > 0) filledFields += 2;

    // Organization (3 fields)
    const organization = profileData.organization || {};
    totalFields += 3;
    if (organization.name) filledFields++;
    if (organization.role) filledFields++;
    if (organization.employee_id) filledFields++;

    const percentage = Math.round((filledFields / totalFields) * 100);
    setCompletionPercentage(percentage);
  };

  const handleUpdatePersonal = async (data) => {
    try {
      const updated = await profileAPI.updatePersonal(data);
      setProfileData(prev => ({ ...prev, personal: updated.personal }));
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateEducation = async (data) => {
    try {
      const updated = await profileAPI.updateEducation(data);
      setProfileData(prev => ({ ...prev, education: updated.education }));
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateCertificates = async (data) => {
    try {
      const updated = await profileAPI.updateCertificates(data);
      setProfileData(prev => ({ ...prev, certificates: updated.certificates }));
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateOrganization = async (data) => {
    try {
      const updated = await profileAPI.updateOrganization(data);
      setProfileData(prev => ({ ...prev, organization: updated.organization }));
    } catch (err) {
      throw err;
    }
  };

  const handleKeyPress = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading-container">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header Banner */}
      <div className="profile-header">
        <div className="profile-banner">
          {/* Avatar Section */}
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          {/* User Info */}
          <div className="profile-info">
            <h1>{user?.name || "User"}</h1>
            <span className="profile-role">{user?.role || "Member"}</span>
            <p className="profile-email">
              <Mail className="email-icon" size={16} />
              {user?.email}
            </p>
          </div>

          {/* Completion Circle */}
          <div className="profile-completion">
            <div className="completion-circle">
              <svg viewBox="0 0 100 100">
                <circle
                  className="completion-bg"
                  cx="50"
                  cy="50"
                  r="45"
                />
                <circle
                  className="completion-progress"
                  cx="50"
                  cy="50"
                  r="45"
                  style={{
                    strokeDasharray: `${completionPercentage * 2.827}, 282.7`
                  }}
                />
              </svg>
              <div className="completion-text">
                <span className="percentage">{completionPercentage}%</span>
                <span className="label">Complete</span>
              </div>
            </div>
            <p className="completion-message">
              {completionPercentage === 100
                ? "Profile completed!"
                : "Complete your profile"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        {/* Sidebar Navigation */}
        <div className="profile-sidebar">
          <button
            className={`sidebar-btn ${activeSection === "personal" ? "active" : ""}`}
            onClick={() => setActiveSection("personal")}
            onKeyPress={(e) => handleKeyPress(e, () => setActiveSection("personal"))}
            aria-label="Personal Information"
          >
            <User className="sidebar-icon" size={22} />
            <span className="sidebar-label">Personal Info</span>
          </button>

          <button
            className={`sidebar-btn ${activeSection === "education" ? "active" : ""}`}
            onClick={() => setActiveSection("education")}
            onKeyPress={(e) => handleKeyPress(e, () => setActiveSection("education"))}
            aria-label="Education"
          >
            <GraduationCap className="sidebar-icon" size={22} />
            <span className="sidebar-label">Education</span>
          </button>

          <button
            className={`sidebar-btn ${activeSection === "certificates" ? "active" : ""}`}
            onClick={() => setActiveSection("certificates")}
            onKeyPress={(e) => handleKeyPress(e, () => setActiveSection("certificates"))}
            aria-label="Certificates"
          >
            <Award className="sidebar-icon" size={22} />
            <span className="sidebar-label">Certificates</span>
          </button>

          <button
            className={`sidebar-btn ${activeSection === "organization" ? "active" : ""}`}
            onClick={() => setActiveSection("organization")}
            onKeyPress={(e) => handleKeyPress(e, () => setActiveSection("organization"))}
            aria-label="Organization"
          >
            <Building2 className="sidebar-icon" size={22} />
            <span className="sidebar-label">Organization</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="profile-main">
          {activeSection === "personal" && (
            <PersonalInfo
              data={profileData.personal || {}}
              user={user}
              onUpdate={handleUpdatePersonal}
            />
          )}
          {activeSection === "education" && (
            <Education
              data={profileData.education || []}
              onUpdate={handleUpdateEducation}
            />
          )}
          {activeSection === "certificates" && (
            <Certificates
              data={profileData.certificates || []}
              onUpdate={handleUpdateCertificates}
            />
          )}
          {activeSection === "organization" && (
            <Organization
              data={profileData.organization || {}}
              onUpdate={handleUpdateOrganization}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;