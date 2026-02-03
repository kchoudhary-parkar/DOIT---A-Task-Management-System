import React, { useState, useEffect } from "react";
import { FiGitBranch, FiGitCommit, FiGitPullRequest, FiCheck, FiClock } from "react-icons/fi";
import { taskAPI } from "../../services/api";
import "./DevelopmentSection.css";

function DevelopmentSection({ taskId }) {
  const [gitActivity, setGitActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGitActivity();
  }, [taskId]);

  const fetchGitActivity = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("Fetching git activity for task:", taskId);
      
      const result = await taskAPI.getGitActivity(taskId);
      console.log("Git activity response:", result);
      
      // Handle the response structure from success_response
      const data = result.data || result;
      setGitActivity(data);
      
      console.log("Branches:", data.branches_count);
      console.log("Commits:", data.commits_count);
      console.log("PRs:", data.pull_requests_count);
    } catch (err) {
      console.error("Error loading git activity:", err);
      setError("Error loading git activity");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="development-section">
        <h3 className="development-title">Development</h3>
        <div className="development-loading">Loading git activity...</div>
      </div>
    );
  }

  if (error) {
    console.log("Development section error:", error);
    return null; // Don't show section if there's an error
  }
  
  if (!gitActivity) {
    console.log("No git activity data received");
    return null;
  }

  const { branches_count, commits_count, pull_requests_count, pull_requests } = gitActivity;

  // Don't show section if there's no activity
  if (branches_count === 0 && commits_count === 0 && pull_requests_count === 0) {
    console.log("No git activity found (0 branches, 0 commits, 0 PRs)");
    // TEMPORARILY show the section anyway for debugging
    return (
      <div className="development-section">
        <h3 className="development-title">Development</h3>
        <div className="development-loading" style={{color: '#94a3b8'}}>
          No Git activity found for this task. 
          <br />
          <small>Make sure branches/commits mention the ticket ID: {gitActivity.ticket_id || 'N/A'}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="development-section">
      <h3 className="development-title">Development</h3>
      
      <div className="development-stats">
        {branches_count > 0 && (
          <div className="dev-stat-item">
            <FiGitBranch className="dev-icon" />
            <span className="dev-stat-number">{branches_count}</span>
            <span className="dev-stat-label">branch{branches_count !== 1 ? 'es' : ''}</span>
          </div>
        )}
        
        {commits_count > 0 && (
          <div className="dev-stat-item">
            <FiGitCommit className="dev-icon" />
            <span className="dev-stat-number">{commits_count}</span>
            <span className="dev-stat-label">commit{commits_count !== 1 ? 's' : ''}</span>
          </div>
        )}
        
        {pull_requests_count > 0 && (
          <div className="dev-stat-item">
            <FiGitPullRequest className="dev-icon" />
            <span className="dev-stat-number">{pull_requests_count}</span>
            <span className="dev-stat-label">pull request{pull_requests_count !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {pull_requests && pull_requests.length > 0 && (
        <div className="pull-requests-list">
          {pull_requests.map((pr) => (
            <div key={pr.pr_number} className={`pr-item pr-status-${pr.status}`}>
              <div className="pr-header">
                <FiGitPullRequest className="pr-icon" />
                <span className="pr-title">#{pr.pr_number}: {pr.title}</span>
              </div>
              <div className="pr-meta">
                {pr.status === 'merged' && (
                  <>
                    <span className="pr-status-badge pr-merged">
                      <FiCheck size={12} />
                      MERGED
                    </span>
                    <span className="pr-time">
                      <FiClock size={12} />
                      {pr.time_ago}
                    </span>
                  </>
                )}
                {pr.status === 'open' && (
                  <span className="pr-status-badge pr-open">OPEN</span>
                )}
                {pr.status === 'closed' && (
                  <span className="pr-status-badge pr-closed">CLOSED</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DevelopmentSection;
