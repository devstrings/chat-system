"use client";

import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { CButton, CContainer, CHeader, CHeaderBrand, CSpinner } from "@coreui/react";

type ProtectedShellProps = {
  title: string;
  children: ReactNode;
};

export default function ProtectedShell({ title, children }: ProtectedShellProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          <span>Redirecting to login...</span>
        </div>
      </div>
    );
  }

  const managerName = session?.user?.name || "Manager";

  return (
    <div className="min-vh-100 bg-body-tertiary d-flex flex-column">
      <CHeader className="border-bottom bg-white">
        <CContainer fluid className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
          <CHeaderBrand className="fw-semibold">CoreUI Admin Panel - {managerName}</CHeaderBrand>
          <div className="d-flex align-items-center gap-2">
            <Link href="/dashboard" className="btn btn-outline-primary btn-sm">
              Dashboard
            </Link>
            <Link href="/users" className="btn btn-outline-primary btn-sm">
              Users
            </Link>
            <Link href="/appSettings" className="btn btn-outline-primary btn-sm">
              App Settings
            </Link>
            <CButton color="danger" variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </CButton>
          </div>
        </CContainer>
      </CHeader>

      <CContainer fluid className="py-4">
        <h4 className="mb-3">{title}</h4>
        {children}
      </CContainer>
    </div>
  );
}
