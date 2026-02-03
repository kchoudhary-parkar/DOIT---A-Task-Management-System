import React, { useState, useEffect, useCallback } from "react";
import { 
  FiUsers, FiSearch, FiUserPlus, FiUserMinus, 
  FiAlertCircle, FiCheckCircle, FiAward 
} from "react-icons/fi";
import { memberAPI, userAPI } from "../../services/api";
import "./MemberManager.css";
import Loader from "../Loader/Loader";

function MemberManager({ projectId, isOwner, onMembersUpdate }) {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await memberAPI.getMembers(projectId);
      setMembers(data.members || []);
    } catch (err) {
      console.error("Error fetching members:", err);
      if (!err.message.includes("Not Found")) {
        setError(err.message || "Failed to load team members");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setError("");

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearching(true);
      const data = await userAPI.searchByEmail(query);
      setSearchResults(data.users || []);
      setShowSearchResults(true);
    } catch (err) {
      setError(err.message || "Failed to search users");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (user) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await memberAPI.addMember(projectId, user.email);
      setSuccess(`${user.name} added successfully!`);
      setSearchQuery("");
      setSearchResults([]);
      setShowSearchResults(false);
      await fetchMembers();
      if (onMembersUpdate) {
        onMembersUpdate();
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      await memberAPI.removeMember(projectId, userId);
      setSuccess("Member removed successfully!");
      await fetchMembers();
      if (onMembersUpdate) {
        onMembersUpdate();
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-manager">
      <div className="member-manager-header">
        <div className="header-title">
          <FiUsers size={20} />
          <h3>Project Members ({members.length})</h3>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <FiCheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {isOwner && (
        <div className="add-member-form">
          <div className="search-container">
            <div className="search-input-wrapper">
              <FiSearch size={18} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search user by email..."
                disabled={loading}
              />
            </div>
            {searching && (
              <span className="search-loading">
                <div className="spinner-small"></div>
                Searching...
              </span>
            )}
          </div>
          
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((user) => (
                <div key={user._id} className="search-result-item">
                  <div className="search-user-info">
                    <div className="search-user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <strong>{user.name}</strong>
                      <p>{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user)}
                    className="btn-add"
                    disabled={loading}
                  >
                    <FiUserPlus size={16} />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {showSearchResults && searchResults.length === 0 && !searching && (
            <div className="no-results">
              <FiAlertCircle size={18} />
              <span>No users found</span>
            </div>
          )}
        </div>
      )}

      {loading && members.length === 0 ? (
        <div className="loading-text">
          <Loader />
        </div>
      ) : (
        <div className="members-list">
          {members.length === 0 ? (
            <div className="no-members">
              <FiUsers size={32} />
              <p>No members added yet.</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.user_id} className="member-item">
                <div className="member-info">
                  <div className="member-avatar">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-details">
                    <div className="member-name-row">
                      <h4>{member.name}</h4>
                      {member.is_owner && (
                        <span className="owner-badge">
                          <FiAward size={12} />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="member-email">{member.email}</p>
                    <span className="member-added-date">
                      <FiCheckCircle size={12} />
                      Added {new Date(member.added_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {isOwner && !member.is_owner && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="btn-remove"
                    disabled={loading}
                  >
                    <FiUserMinus size={16} />
                    Remove
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default MemberManager;