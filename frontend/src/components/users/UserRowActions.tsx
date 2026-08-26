"use client";
import { useState } from "react";
import { toggleUserStatus, updateUserRole } from "@/app/actions/admin";

export function UserRowActions({ user, isSuperAdmin }: { user: { id: string; status: string; global_roles: string[] }; isSuperAdmin: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleToggleStatus() {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    if (!confirm(`Are you sure you want to set this user status to ${nextStatus}?`)) return;
    setLoading(true);
    try {
      await toggleUserStatus(user.id, nextStatus);
    } catch (e: any) {
      alert(e.message || "Action failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAdmin() {
    if (!isSuperAdmin) return;
    const currentRoles = user.global_roles ?? [];
    const hasAdmin = currentRoles.includes("admin");
    const nextRoles = hasAdmin ? currentRoles.filter(r => r !== "admin") : [...currentRoles, "admin"];
    if (!confirm(`Are you sure you want to ${hasAdmin ? "revoke" : "grant"} admin role?`)) return;
    setLoading(true);
    try {
      await updateUserRole(user.id, nextRoles);
    } catch (e: any) {
      alert(e.message || "Role update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button
        onClick={handleToggleStatus}
        disabled={loading}
        className={user.status === "active" ? "btn btn-danger" : "btn btn-ghost"}
        style={{ padding: "4px 8px", fontSize: 11 }}
      >
        {user.status === "active" ? "Suspend" : "Activate"}
      </button>

      {isSuperAdmin && (
        <button
          onClick={handleToggleAdmin}
          disabled={loading}
          className="btn btn-ghost"
          style={{ padding: "4px 8px", fontSize: 11 }}
        >
          {user.global_roles?.includes("admin") ? "Demote" : "Make Admin"}
        </button>
      )}
    </div>
  );
}