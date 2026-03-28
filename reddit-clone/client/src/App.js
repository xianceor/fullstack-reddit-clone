import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Layout/Navbar';
import { PostSkeleton } from './components/UI/Skeleton';
import './index.css';

// Lazy-load all pages — reduces initial bundle size
const Home            = lazy(() => import('./pages/Home'));
const PostDetail      = lazy(() => import('./pages/PostDetail'));
const SubredditPage   = lazy(() => import('./pages/SubredditPage'));
const Search          = lazy(() => import('./pages/Search'));
const Submit          = lazy(() => import('./pages/Submit'));
const CreateSubreddit = lazy(() => import('./pages/CreateSubreddit'));
const Communities     = lazy(() => import('./pages/Communities'));
const { Login, Register } = { Login: lazy(() => import('./pages/Auth').then(m => ({ default: m.Login }))), Register: lazy(() => import('./pages/Auth').then(m => ({ default: m.Register }))) };

/** Full-page loading fallback shown during lazy-load */
const PageLoader = () => (
  <div style={{ maxWidth: 740, margin: '24px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <PostSkeleton /><PostSkeleton /><PostSkeleton />
  </div>
);

const App = () => (
  <AuthProvider>
    <SocketProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: { fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px', maxWidth: 380 },
              success: { iconTheme: { primary: '#2e7d32', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#d93025', secondary: '#fff' } },
            }}
          />

          <Navbar />

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"                              element={<Home />} />
              <Route path="/login"                         element={<Login />} />
              <Route path="/register"                      element={<Register />} />
              <Route path="/submit"                        element={<Submit />} />
              <Route path="/search"                        element={<Search />} />
              <Route path="/r/create"                      element={<CreateSubreddit />} />
              <Route path="/communities"                   element={<Communities />} />
              <Route path="/r/:subredditName"              element={<SubredditPage />} />
              <Route path="/r/:subredditName/post/:postId" element={<PostDetail />} />
              {/* Catch-all → home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NotificationProvider>
    </SocketProvider>
  </AuthProvider>
);

export default App;
