import RouteBoundary from "./components/RouteBoundary";
import { LoadingState } from "./components/docshare/ResourceState";
const Help = lazy(() => import("./pages/Help"));
const Support = lazy(() => import("./pages/Support"));
const Policy = lazy(() => import("./pages/Policy"));
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
const WebSearch = lazy(() => import("./pages/WebSearch"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Upload = lazy(() => import("./pages/Upload"));
import Home from "./pages/Home";
const Profile = lazy(() => import("./pages/Profile"));
const MyDocuments = lazy(() => import("./pages/MyDocuments"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SavedDocuments = lazy(() => import("./pages/SavedDocuments"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DocumentDetail = lazy(() => import("./pages/DocumentDetail"));
const Trash = lazy(() => import("./pages/Trash"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const DownloadHistory = lazy(() => import("./pages/DownloadHistory"));
const GoogleAuthSuccess = lazy(() => import("./pages/GoogleAuthSuccess"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VIPUpgrade = lazy(() => import("./pages/VIPUpgrade"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
import axiosClient from "./api/axiosClient";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/docshare/AppShell";
const AIChat = lazy(() => import("./pages/AIChat"));

function AppLayout({ user, refreshUser }) {
  const location = useLocation();
  const authPage = ["/login", "/register"].includes(location.pathname);
  const content = (
    <RouteBoundary key={location.pathname}>
      <Suspense fallback={<LoadingState label="Đang mở trang…" />}>
        <Routes>
          <Route path="/help" element={<Help />} />
          <Route path="/support" element={<Support />} />
          <Route path="/terms" element={<Policy kind="terms" />} />
          <Route path="/privacy" element={<Policy kind="privacy" />} />
          <Route path="/copyright" element={<Policy kind="copyright" />} />
          <Route path="/" element={<Home key={location.search} />} />
          <Route
            path="/web-search"
            element={
              <ProtectedRoute user={user}>
                <WebSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={<Home catalog key={location.search} />}
          />
          <Route
            path="/ai-chat"
            element={
              <ProtectedRoute user={user}>
                <AIChat key={location.search} user={user} />
              </ProtectedRoute>
            }
          />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/users/:userId" element={<UserProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute user={user}>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-documents"
            element={
              <ProtectedRoute user={user}>
                <MyDocuments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} adminOnly>
                <AdminDashboard key={location.search} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved-documents"
            element={
              <ProtectedRoute user={user}>
                <SavedDocuments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trash"
            element={
              <ProtectedRoute user={user}>
                <Trash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/download-history"
            element={
              <ProtectedRoute user={user}>
                <DownloadHistory />
              </ProtectedRoute>
            }
          />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/vip"
            element={
              <ProtectedRoute user={user}>
                <VIPUpgrade onVIPActivated={refreshUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/result"
            element={<PaymentResult onPaymentSuccess={refreshUser} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteBoundary>
  );
  if (authPage) return <main>{content}</main>;
  return (
    <AppShell key={location.pathname.split("/")[1]} user={user}>
      {content}
    </AppShell>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const isAuthenticated = !!localStorage.getItem("token");

  const fetchUser = useCallback(() => {
    if (isAuthenticated) {
      axiosClient
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          /* Authentication failures are handled by axiosClient; preserve session on network errors. */
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUser();

    const handleFocus = () => {
      if (localStorage.getItem("token")) {
        fetchUser();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isAuthenticated, fetchUser]);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#0f172a",
            color: "#fff",
            borderRadius: "14px",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          },
        }}
      />
      <AppLayout user={user} setUser={setUser} refreshUser={fetchUser} />
    </Router>
  );
}

export default App;
