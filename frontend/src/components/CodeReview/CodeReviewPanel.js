/*
 * Code Review Panel Component
 * Displays AI-powered code review results in task detail modal
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CodeReviewPanel.css';

const API_BASE = 'http://localhost:8000';

// Get tab session key for security
const getTabSessionKey = () => {
  let key = sessionStorage.getItem("tab_session_key");
  if (!key) {
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem("tab_session_key", key);
  }
  return key;
};

// Get auth headers with tab session key
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'X-Tab-Session-Key': getTabSessionKey()
  };
};

const CodeReviewPanel = ({ taskId, projectId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());

  useEffect(() => {
    fetchCodeReviews();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchCodeReviews, 10000);
    return () => clearInterval(interval);
  }, [taskId]);

  const toggleReviewExpansion = (reviewId) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const fetchCodeReviews = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/code-review/task/${taskId}`,
        { headers: getAuthHeaders() }
      );
      
      if (response.data.status === 'success') {
        setReviews(response.data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching code reviews:', err);
      setError(err.response?.data?.detail || 'Failed to load code reviews');
      setLoading(false);
    }
  };

  const handleCreateReview = async () => {
    if (!prUrl.trim()) {
      alert('Please enter a valid PR URL');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/code-review/create`,
        {
          project_id: projectId,
          task_id: taskId,
          pr_url: prUrl,
          trigger_analysis: true
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.status === 'success') {
        setShowCreateModal(false);
        setPrUrl('');
        fetchCodeReviews();
        alert('Code review created! Analysis in progress...');
      }
    } catch (err) {
      console.error('Error creating code review:', err);
      alert(err.response?.data?.detail || 'Failed to create code review');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: '#ffa500', label: 'Pending', icon: '⏳' },
      in_progress: { color: '#3498db', label: 'In Progress', icon: '🔄' },
      completed: { color: '#27ae60', label: 'Completed', icon: '✅' },
      failed: { color: '#e74c3c', label: 'Failed', icon: '❌' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#e74c3c',
      high: '#e67e22',
      medium: '#f39c12',
      low: '#3498db',
      info: '#95a5a6'
    };
    return colors[severity] || colors.info;
  };

  const renderReviewSummary = (review) => {
    if (review.review_status !== 'completed') {
      return null;
    }

    const isExpanded = expandedReviews.has(review._id);

    return (
      <div className="review-summary">
        {/* Always show score cards and issue counts */}
        <div className="score-cards">
          <div className="score-card quality">
            <div className="score-label">Quality Score</div>
            <div className="score-value">{review.quality_score.toFixed(1)}/10</div>
          </div>
          <div className="score-card security">
            <div className="score-label">Security Score</div>
            <div className="score-value">{review.security_score.toFixed(1)}/10</div>
          </div>
        </div>

        <div className="issues-summary">
          {review.critical_issues_count > 0 && (
            <div className="issue-count critical">
              ⚠️ {review.critical_issues_count} Critical
            </div>
          )}
          {review.high_issues_count > 0 && (
            <div className="issue-count high">
              🔴 {review.high_issues_count} High
            </div>
          )}
          {review.medium_issues_count > 0 && (
            <div className="issue-count medium">
              🟡 {review.medium_issues_count} Medium
            </div>
          )}
          {review.low_issues_count > 0 && (
            <div className="issue-count low">
              🔵 {review.low_issues_count} Low
            </div>
          )}
        </div>

        {/* Show AI insights only when expanded */}
        {isExpanded && review.ai_insights && (
          <div className="ai-insights">
            <h4>🤖 AI Analysis Summary</h4>
            <p>{review.ai_insights.summary}</p>
            
            {review.ai_insights.strengths?.length > 0 && (
              <div className="insights-section">
                <h5>✨ Strengths</h5>
                <ul>
                  {review.ai_insights.strengths.slice(0, 3).map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {review.ai_insights.weaknesses?.length > 0 && (
              <div className="insights-section">
                <h5>⚠️ Areas for Improvement</h5>
                <ul>
                  {review.ai_insights.weaknesses.slice(0, 3).map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="review-actions">
          <button 
            className="expand-btn"
            onClick={() => toggleReviewExpansion(review._id)}
          >
            {isExpanded ? '▲ Collapse' : '▼ Expand Details'}
          </button>
          <button 
            className="detailed-report-btn"
            onClick={() => setSelectedReview(review)}
          >
            📄 Full Report
          </button>
        </div>
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="code-review-panel loading">
        <div className="spinner">🔄 Loading code reviews...</div>
      </div>
    );
  }

  return (
    <div className="code-review-panel">
      <div className="panel-header">
        <h3>🔍 Code Reviews</h3>
        <button 
          className="create-review-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + New Review
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {reviews.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No code reviews yet</p>
          <button onClick={() => setShowCreateModal(true)}>
            Create First Review
          </button>
        </div>
      )}

      <div className="reviews-list">
        {reviews.map(review => (
          <div key={review._id} className="review-item">
            <div className="review-header">
              <div className="pr-info">
                <a 
                  href={review.pr_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pr-link"
                >
                  PR #{review.pr_number}: {review.pr_title}
                </a>
                <div className="pr-meta">
                  by {review.pr_author} • {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
              {getStatusBadge(review.review_status)}
            </div>

            {renderReviewSummary(review)}
          </div>
        ))}
      </div>

      {/* Create Review Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Code Review</h3>
            <p>Enter the GitHub Pull Request URL to analyze:</p>
            <input
              type="text"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="pr-url-input"
            />
            <div className="modal-actions">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateReview}
                disabled={creating}
                className="create-btn"
              >
                {creating ? '🔄 Creating...' : '✨ Create Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Review Modal */}
      {selectedReview && (
        <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Code Review Details</h3>
              <button onClick={() => setSelectedReview(null)} className="close-btn">×</button>
            </div>
            
            <div className="detailed-review">
              <div className="review-metadata">
                <h4>PR Information</h4>
                <p><strong>Title:</strong> {selectedReview.pr_title}</p>
                <p><strong>Branch:</strong> {selectedReview.pr_branch}</p>
                <p><strong>Files Changed:</strong> {selectedReview.total_files_changed}</p>
                <p><strong>Changes:</strong> +{selectedReview.total_additions} -{selectedReview.total_deletions}</p>
              </div>

              {selectedReview.security_findings?.length > 0 && (
                <div className="security-findings">
                  <h4>🔒 Security Findings ({selectedReview.security_findings.length})</h4>
                  {selectedReview.security_findings.slice(0, 10).map((finding, idx) => (
                    <div 
                      key={idx} 
                      className="finding-item"
                      style={{ borderLeft: `4px solid ${getSeverityColor(finding.severity)}` }}
                    >
                      <div className="finding-header">
                        <span className="finding-type">{finding.type}</span>
                        <span className="finding-severity">{finding.severity.toUpperCase()}</span>
                      </div>
                      <p className="finding-message">{finding.message}</p>
                      <p className="finding-location">
                        📄 {finding.file_path}:{finding.line_number}
                      </p>
                      <code className="finding-snippet">{finding.code_snippet}</code>
                      <p className="finding-recommendation">
                        💡 <strong>Recommendation:</strong> {finding.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selectedReview.ai_insights?.best_practices?.length > 0 && (
                <div className="best-practices">
                  <h4>✨ Best Practice Recommendations</h4>
                  {selectedReview.ai_insights.best_practices.map((practice, idx) => (
                    <div key={idx} className="practice-item">
                      <div className="practice-issue">{practice.issue}</div>
                      <div className="practice-suggestion">{practice.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeReviewPanel;
