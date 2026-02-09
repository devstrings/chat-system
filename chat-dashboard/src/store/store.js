// 📁 src/store/store.js

import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer'; 

enableMapSet();

// IMPORT ALL SLICES 
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import userReducer from './slices/userSlice';
import groupReducer from './slices/groupSlice';
import socketReducer from './slices/socketSlice';

//  IMPORT MIDDLEWARE 
import socketMiddleware from './middleware/socketMiddleware';

//  CONFIGURE STORE 
export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    user: userReducer,
    group: groupReducer,
    socket: socketReducer,
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Socket actions
          'socket/setSocket',
          'socket/setOnlineUsers',
          'socket/addOnlineUser',
          'socket/removeOnlineUser',
          
          // User actions
          'user/setOnlineUsers',
          'user/addOnlineUser',
          'user/removeOnlineUser',
          
          // Chat actions
          'chat/pinConversation',
          'chat/archiveConversation',
          'chat/updateTyping',
          'chat/addMessage', 
          
          // Group actions
          'group/updateGroupTyping',
        ],
        
        ignoredPaths: [
          // Socket paths
          'socket.socket',
          'socket.onlineUsers',
          
          // User paths
          'user.onlineUsers',
          
          // Chat paths
          'chat.pinnedConversations',
          'chat.archivedConversations',
          'chat.typingUsers',
          
          // Group paths
          'group.typingUsers',
        ],
      },
    }).concat(socketMiddleware),
});

export default store;