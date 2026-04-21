import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type ApiUser = {
  _id: string;
  username: string;
  email: string;
  profileImage?: string;
  createdAt: string;
  isSuspended: boolean;
};

export type UsersResponse = {
  data: ApiUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type StatsResponse = {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalGroups: number;
};

export type SettingsResponse = {
  branding?: {
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
  maintenanceMode?: boolean;
  allowRegistrations?: boolean;
  maxGroupSize?: number;
  aiFeatures?: {
    enabled?: boolean;
  };
  aiProvider?: {
    provider?: string;
    model?: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      headers.set("content-type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    getStats: builder.query<StatsResponse, { token: string }>({
      query: ({ token }) => ({
        url: "/admin/stats",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    }),
    getSettings: builder.query<SettingsResponse, { token: string }>({
      query: ({ token }) => ({
        url: "/admin/settings",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    }),
    updateSettings: builder.mutation<SettingsResponse, { token: string; body: SettingsResponse }>({
      query: ({ token, body }) => ({
        url: "/admin/settings",
        method: "PUT",
        body,
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    }),
    getUsers: builder.query<
      UsersResponse,
      { token: string; page?: number; limit?: number; search?: string }
    >({
      query: (params) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 20;
        const search = params?.search ?? "";
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          search,
        });
        return {
          url: `/admin/users?${qs.toString()}`,
          headers: {
            authorization: `Bearer ${params.token}`,
          },
        };
      },
      providesTags: ["Users"],
    }),
    suspendUser: builder.mutation<
      { message: string; user: ApiUser },
      { token: string; id: string; suspend: boolean }
    >({
      query: ({ token, id, suspend }) => ({
        url: `/admin/users/${id}/suspend`,
        method: "PATCH",
        body: { suspend },
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetUsersQuery,
  useSuspendUserMutation,
} = api;
