import { createSlice } from '@reduxjs/toolkit';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    socket: null,
    connected: false,
    onlineUsers: new Set(),
  },
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    
    setConnected: (state, action) => {
      state.connected = action.payload;
    },
    
    setOnlineUsers: (state, action) => {
      state.onlineUsers = new Set(action.payload);
    },
    
    addOnlineUser: (state, action) => {
      state.onlineUsers = new Set([...state.onlineUsers, action.payload]);
    },
    
    removeOnlineUser: (state, action) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(action.payload);
      state.onlineUsers = newSet;
    },
    
    clearSocket: (state) => {
      state.socket = null;
      state.connected = false;
      state.onlineUsers = new Set();
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