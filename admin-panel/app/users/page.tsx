"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import ProtectedShell from "@/components/ProtectedShell";
import { useGetUsersQuery, useSuspendUserMutation } from "@/lib/services/api";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const { data: usersData, isLoading } = useGetUsersQuery(
    { token: accessToken ?? "", page: 1, limit: 20, search },
    { skip: !accessToken },
  );
  const [suspendUser, { isLoading: togglingSuspend }] = useSuspendUserMutation();

  const handleSuspendToggle = async (id: string, suspended: boolean) => {
    if (!accessToken) return;
    await suspendUser({ token: accessToken, id, suspend: !suspended });
  };

  return (
    <ProtectedShell title="Users">
      <CCard>
        <CCardHeader className="fw-semibold">Users Management</CCardHeader>
        <CCardBody>
          <div className="mb-3 d-flex gap-2">
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by username or email"
            />
          </div>
          {isLoading ? (
            <div className="d-flex align-items-center gap-2 py-4">
              <CSpinner size="sm" />
              <span>Loading users...</span>
            </div>
          ) : null}
          <CTable align="middle" hover responsive striped>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>ID</CTableHeaderCell>
                <CTableHeaderCell>Username</CTableHeaderCell>
                <CTableHeaderCell>Email</CTableHeaderCell>
                <CTableHeaderCell>Created</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {(usersData?.data ?? []).map((user) => (
                <CTableRow key={user._id}>
                  <CTableDataCell>{user._id}</CTableDataCell>
                  <CTableDataCell>{user.username}</CTableDataCell>
                  <CTableDataCell>{user.email}</CTableDataCell>
                  <CTableDataCell>{new Date(user.createdAt).toLocaleDateString()}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={user.isSuspended ? "danger" : "success"}>
                      {user.isSuspended ? "Suspended" : "Active"}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-end d-flex justify-content-end gap-2">
                    <CButton
                      size="sm"
                      color={user.isSuspended ? "success" : "warning"}
                      variant="outline"
                      disabled={togglingSuspend || !accessToken}
                      onClick={() => handleSuspendToggle(user._id, user.isSuspended)}
                    >
                      {user.isSuspended ? "Unsuspend" : "Suspend"}
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </ProtectedShell>
  );
}
