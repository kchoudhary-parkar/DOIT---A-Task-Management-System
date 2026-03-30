import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { userAPI } from "../../services/api";
import "../Dashboard/DashboardPage.css";
import "./UserManagementPage.css";
import Loader from "../../components/Loader/Loader";

const DeleteUserModal = ({ userName, open, onClose, onConfirm, deleting }) => {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmText("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="umodal-backdrop">
      <div className="umodal">
        <h3>Delete User</h3>
        <p>
          You are about to permanently delete <strong>{userName}</strong>. Type <strong>DELETE</strong> to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          className="umodal-input"
        />
        <div className="umodal-actions">
          <button className="umodal-cancel" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="umodal-delete"
            onClick={() => onConfirm(confirmText)}
            disabled={deleting || confirmText !== "DELETE"}
          >
            {deleting ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RoleChangeModal = ({ userName, actionLabel, open, onClose, onConfirm, updating }) => {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmText("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="umodal-backdrop">
      <div className="umodal">
        <h3>Confirm Role Change</h3>
        <p>
          You are about to <strong>{actionLabel}</strong> <strong>{userName}</strong>. Type <strong>CONFIRM</strong> to continue.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type CONFIRM"
          className="umodal-input"
        />
        <div className="umodal-actions">
          <button className="umodal-cancel" onClick={onClose} disabled={updating}>
            Cancel
          </button>
          <button
            className="umodal-primary"
            onClick={() => onConfirm(confirmText)}
            disabled={updating || confirmText !== "CONFIRM"}
          >
            {updating ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [roleChangeInProgress, setRoleChangeInProgress] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const isSuperAdmin = user?.role === "super-admin";

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await userAPI.getUserManagementData();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Failed to load user management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [isSuperAdmin, navigate]);

  const handleRoleAction = (targetUser) => {
    setRoleChangeUser(targetUser);
  };

  const handleRoleChangeConfirm = async (confirmationText) => {
    if (!roleChangeUser) return;
    if (confirmationText !== "CONFIRM") return;

    const nextRole = roleChangeUser.role === "admin" ? "member" : "admin";

    try {
      setRoleChangeInProgress(true);
      await userAPI.updateUserRole(roleChangeUser.id, nextRole);
      setRoleChangeUser(null);
      await fetchData();
    } catch (err) {
      alert(err.message || "Failed to update user role");
    } finally {
      setRoleChangeInProgress(false);
    }
  };

  const handleDeleteConfirm = async (confirmationText) => {
    if (!deletingUser) return;

    try {
      setDeleteInProgress(true);
      await userAPI.deleteUser(deletingUser.id, confirmationText);
      setDeletingUser(null);
      await fetchData();
    } catch (err) {
      alert(err.message || "Failed to delete user");
    } finally {
      setDeleteInProgress(false);
    }
  };

  const tableRows = useMemo(() => {
    return users.map((item) => {
      const teamLabel = (item.projects || []).length > 0 ? item.projects.join(", ") : "-";
      return {
        ...item,
        teamLabel,
      };
    });
  }, [users]);

  const roleActionLabel = roleChangeUser
    ? roleChangeUser.role === "admin"
      ? "demote to member"
      : "promote to admin"
    : "";

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div style={{ position: "relative", minHeight: "360px" }}>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container user-management-page">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>User Management</h1>
            <p className="dashboard-subtitle">Manage all users across projects and teams</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Project/Team</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((entry) => {
                const canChangeRole = entry.role === "member" || entry.role === "admin";
                const roleActionLabel = entry.role === "admin" ? "Demote to Member" : "Promote to Admin";
                const showRoleAction = canChangeRole;
                const disableDelete = entry.role === "super-admin" || entry.id === user?.id;

                return (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.email}</td>
                    <td title={entry.teamLabel}>{entry.teamLabel}</td>
                    <td>
                      <span className={`role-badge ${entry.role}`}>
                        {entry.role === "super-admin"
                          ? "Super Admin"
                          : entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {showRoleAction ? (
                          <button
                            className={entry.role === "admin" ? "btn-demote" : "btn-promote"}
                            onClick={() => handleRoleAction(entry)}
                          >
                            {roleActionLabel}
                          </button>
                        ) : (
                          <span className="text-muted">No role action</span>
                        )}

                        <button
                          className="btn-delete-user"
                          onClick={() => setDeletingUser(entry)}
                          disabled={disableDelete}
                          title={disableDelete ? "Cannot delete this user" : "Delete user"}
                        >
                          Delete User
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <RoleChangeModal
          open={Boolean(roleChangeUser)}
          userName={roleChangeUser?.name || ""}
          actionLabel={roleActionLabel}
          onClose={() => setRoleChangeUser(null)}
          onConfirm={handleRoleChangeConfirm}
          updating={roleChangeInProgress}
        />

        <DeleteUserModal
          open={Boolean(deletingUser)}
          userName={deletingUser?.name || ""}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleteInProgress}
        />
      </div>
    </div>
  );
};

export default UserManagementPage;
