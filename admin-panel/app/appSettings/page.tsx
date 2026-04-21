"use client";

import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CSpinner,
} from "@coreui/react";
import ProtectedShell from "@/components/ProtectedShell";
import { SettingsResponse, useGetSettingsQuery, useUpdateSettingsMutation } from "@/lib/services/api";

type SettingsForm = {
  appName: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  maxGroupSize: number;
};

export default function AppSettingsPage() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const { data, isLoading } = useGetSettingsQuery({ token: accessToken ?? "" }, { skip: !accessToken });
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Partial<SettingsForm>>({});

  const resolvedForm: SettingsForm = {
    appName: form.appName ?? data?.branding?.appName ?? "",
    maintenanceMode: form.maintenanceMode ?? Boolean(data?.maintenanceMode),
    allowRegistrations: form.allowRegistrations ?? (data?.allowRegistrations ?? true),
    maxGroupSize: form.maxGroupSize ?? Number(data?.maxGroupSize ?? 50),
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    const body: SettingsResponse = {
      branding: { appName: form.appName },
      maintenanceMode: resolvedForm.maintenanceMode,
      allowRegistrations: resolvedForm.allowRegistrations,
      maxGroupSize: resolvedForm.maxGroupSize,
    };

    await updateSettings({ token: accessToken, body }).unwrap();
    setMessage("Settings updated");
  };

  return (
    <ProtectedShell title="App Settings">
      <CCard>
        <CCardHeader className="fw-semibold">Application Settings</CCardHeader>
        <CCardBody>
          {isLoading ? (
            <div className="d-flex align-items-center gap-2 py-4">
              <CSpinner size="sm" />
              <span>Loading settings...</span>
            </div>
          ) : (
            <CForm onSubmit={handleSubmit}>
              <div className="mb-3">
                <CFormLabel htmlFor="appName">App Name</CFormLabel>
                <CFormInput
                  id="appName"
                  value={resolvedForm.appName}
                  onChange={(event) => setForm((s) => ({ ...s, appName: event.target.value }))}
                />
              </div>
              <div className="mb-3">
                <CFormLabel htmlFor="maxGroupSize">Max Group Size</CFormLabel>
                <CFormInput
                  id="maxGroupSize"
                  type="number"
                  min={2}
                  value={resolvedForm.maxGroupSize}
                  onChange={(event) =>
                    setForm((s) => ({ ...s, maxGroupSize: Number(event.target.value) || 2 }))
                  }
                />
              </div>
              <div className="mb-3">
                <CFormCheck
                  id="maintenanceMode"
                  label="Maintenance mode"
                  checked={resolvedForm.maintenanceMode}
                  onChange={(event) => setForm((s) => ({ ...s, maintenanceMode: event.target.checked }))}
                />
              </div>
              <div className="mb-3">
                <CFormCheck
                  id="allowRegistrations"
                  label="Allow user registrations"
                  checked={resolvedForm.allowRegistrations}
                  onChange={(event) => setForm((s) => ({ ...s, allowRegistrations: event.target.checked }))}
                />
              </div>

              {message ? <p className="text-success mb-3">{message}</p> : null}
              <CButton color="primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </CButton>
            </CForm>
          )}
        </CCardBody>
      </CCard>
    </ProtectedShell>
  );
}
