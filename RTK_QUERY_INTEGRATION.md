# RTK Query Integration Guide

This document explains how RTK Query has been integrated into your React messenger application and how to use it effectively.

## What's Been Added

### 1. Redux Store Configuration (`src/app/store.ts`)
- Configured Redux store with RTK Query
- Added middleware for caching, invalidation, and polling
- Exported typed hooks for use throughout the app

### 2. API Slice (`src/app/api/messengerApi.ts`)
- Centralized API configuration with automatic request/response handling
- Defined TypeScript interfaces for all API responses
- Created endpoints for:
  - **Authentication**: login, register, getCurrentUser, logout, password recovery
  - **Users**: getUsers, getUserById, updateUser
  - **Chats**: getChats, getChatById, createChat, updateChat, deleteChat
  - **Messages**: getMessages, sendMessage, updateMessage, deleteMessage, reactions

### 3. Typed Redux Hooks (`src/shared/hooks/redux.ts`)
- `useAppDispatch` and `useAppSelector` for type-safe Redux usage

### 4. Provider Setup (`src/app/main.tsx`)
- Added Redux Provider to wrap the entire application

## How to Use RTK Query

### Basic Query Example
```tsx
import { useGetChatsQuery } from '@/app/api/messengerApi';

function ChatsList() {
  const { data: chats, error, isLoading } = useGetChatsQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading chats</div>;

  return (
    <div>
      {chats?.map(chat => (
        <div key={chat.id}>{chat.name}</div>
      ))}
    </div>
  );
}
```

### Basic Mutation Example
```tsx
import { useLoginMutation } from '@/app/api/messengerApi';

function LoginForm() {
  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async (credentials) => {
    try {
      const result = await login(credentials).unwrap();
      console.log('Login successful:', result);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form inputs */}
      <button disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Key Benefits

### 1. Automatic Caching
- RTK Query automatically caches your API responses
- Eliminates redundant network requests
- Provides instant data when available

### 2. Background Refetching
- Automatically refetches data when:
  - Window regains focus
  - Network reconnects
  - Cache expires

### 3. Optimistic Updates
- UI updates immediately while request is in progress
- Automatically rolls back if request fails

### 4. Loading States
- Built-in loading, error, and success states
- No need to manage loading state manually

### 5. Type Safety
- Full TypeScript support
- Automatic type inference for all endpoints
- Compile-time error checking

## Example Components

### 1. Updated LoginComponent
The `LoginComponent` now uses `useLoginMutation` instead of manual fetch calls:

```tsx
const [login, { isLoading }] = useLoginMutation();

const handleLogin = async () => {
  try {
    const result = await login({ username, password }).unwrap();
    localStorage.setItem('access_token', result.access_token);
    onLoginSuccess(username);
  } catch (error) {
    setMessage(error?.data?.detail || 'Login failed');
  }
};
```

### 2. ChatsListComponentRTK
Example implementation showing:
- Automatic chat loading with `useGetChatsQuery`
- Error handling and loading states
- Chat creation with `useCreateChatMutation`
- Real-time updates via WebSocket + cache invalidation

### 3. MessageComponentRTK
Complete message handling example with:
- Message loading and pagination
- Sending messages (text and files)
- Message editing and deletion
- Reaction handling
- Real-time message updates

## Cache Management

### Automatic Invalidation
RTK Query automatically invalidates cache when related data changes:

```tsx
// When a new message is sent, it invalidates:
invalidatesTags: [
  { type: 'Message', id: chatId },
  'Chat' // Also updates last message in chat list
]
```

### Manual Cache Updates
For real-time features, you can manually update the cache:

```tsx
// In WebSocket message handler
if (parsedData.type === 'new_message') {
  dispatch(
    messengerApi.util.updateQueryData(
      'getMessages',
      { chatId: parsedData.chatId },
      (draft) => {
        draft.push(parsedData.message);
      }
    )
  );
}
```

## Error Handling

RTK Query provides standardized error handling:

```tsx
const { data, error, isLoading } = useGetChatsQuery();

useEffect(() => {
  if (error) {
    let errorMessage = 'Something went wrong';
    
    if ('data' in error && error.data) {
      errorMessage = (error.data as any).detail || errorMessage;
    } else if ('message' in error) {
      errorMessage = error.message;
    }
    
    // Handle error (show toast, modal, etc.)
    showError(errorMessage);
  }
}, [error]);
```

## Authentication

RTK Query automatically includes authentication headers:

```tsx
// In messengerApi.ts
baseQuery: fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
}),
```

## Migration from Existing Code

To migrate your existing components:

1. **Replace fetch calls** with RTK Query hooks
2. **Remove manual loading states** - use RTK Query's built-in states
3. **Remove manual error handling** - use RTK Query's error objects
4. **Use cache invalidation** instead of manual refetching

### Before (Manual Fetch)
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chats');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### After (RTK Query)
```tsx
const { data, error, isLoading } = useGetChatsQuery();
```

## Best Practices

1. **Use TypeScript interfaces** for all API responses
2. **Implement proper error handling** with user-friendly messages
3. **Use cache invalidation tags** to keep data fresh
4. **Implement optimistic updates** for better UX
5. **Handle loading states** appropriately in your UI
6. **Use polling sparingly** - prefer WebSocket for real-time updates

## Next Steps

1. **Migrate existing components** one by one to use RTK Query
2. **Add optimistic updates** for better user experience
3. **Implement retry logic** for failed requests
4. **Add request debouncing** for search functionality
5. **Set up background sync** for offline support

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure your backend allows the origin
2. **Authentication errors**: Check token format and expiration
3. **Type errors**: Ensure your TypeScript interfaces match API responses
4. **Cache not updating**: Check your invalidation tags

### Debug Mode
Enable RTK Query dev tools in development:

```tsx
import { setupListeners } from '@reduxjs/toolkit/query'

// Enable refetch on focus/reconnect behaviors
setupListeners(store.dispatch)
```

This integration provides a robust foundation for handling all API communication in your messenger application with automatic caching, error handling, and TypeScript support.