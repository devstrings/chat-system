import { createSlice } from "@reduxjs/toolkit";

const socketSlice = createSlice({
  name: "socket",
  initialState: {
    socket: null,
    connected: false,
    onlineUsers: [],
  },
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
    },

    setConnected: (state, action) => {
      state.connected = action.payload;
    },

    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    addOnlineUser: (state, action) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    removeOnlineUser: (state, action) => {
      state.onlineUsers = state.onlineUsers.filter(
        (id) => id !== action.payload,
      );
    },
    clearSocket: (state) => {
      state.socket = null;
      state.connected = false;
      state.onlineUsers = [];
    },
  },
});

export const {
  setSocket,
  setConnected,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  clearSocket,
} = socketSlice.actions;

export default socketSlice.reducer;
