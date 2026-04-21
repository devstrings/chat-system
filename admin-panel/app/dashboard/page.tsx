"use client";

import { useSession } from "next-auth/react";
import { CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from "@coreui/react";
import ProtectedShell from "@/components/ProtectedShell";
import { useGetStatsQuery } from "@/lib/services/api";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <CCard>
      <CCardHeader className="text-muted">{label}</CCardHeader>
      <CCardBody>
        <h3 className="mb-0">{value}</h3>
      </CCardBody>
    </CCard>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const { data, isLoading } = useGetStatsQuery({ token: accessToken ?? "" }, { skip: !accessToken });

  return (
    <ProtectedShell title="Dashboard">
      {isLoading ? (
        <div className="d-flex align-items-center gap-2 py-4">
          <CSpinner size="sm" />
          <span>Loading stats...</span>
        </div>
      ) : (
        <CRow className="g-3">
          <CCol md={6} xl={3}>
            <StatCard label="Total Users" value={data?.totalUsers ?? 0} />
          </CCol>
          <CCol md={6} xl={3}>
            <StatCard label="Active Users" value={data?.activeUsers ?? 0} />
          </CCol>
          <CCol md={6} xl={3}>
            <StatCard label="Total Messages" value={data?.totalMessages ?? 0} />
          </CCol>
          <CCol md={6} xl={3}>
            <StatCard label="Total Groups" value={data?.totalGroups ?? 0} />
          </CCol>
        </CRow>
      )}
    </ProtectedShell>
  );
}
