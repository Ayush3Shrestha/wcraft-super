import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import ApiService from "../../services/apiService";
import {
  AUTH_EVENT,
  clearAdminSession,
  getAdminToken,
} from "../../services/adminAuth";
import NavbarAdmin from "./NavbarAdmin";

// Guards every admin page except the login page. Checks the stored token
// with the backend before rendering, and sends the user to /admin/login
// when there is no valid session.
export default function RequireAdmin() {
  const location = useLocation();
  const [status, setStatus] = useState(() =>
    getAdminToken() ? "checking" : "unauthenticated"
  );

  useEffect(() => {
    if (status !== "checking") return;
    let cancelled = false;
    ApiService.getAdminProfile()
      .then(() => !cancelled && setStatus("authenticated"))
      .catch((err) => {
        if (cancelled) return;
        // Only a rejected token logs the admin out; a server that is down
        // should not throw away a valid session.
        if (err.status === 401) {
          clearAdminSession();
          setStatus("unauthenticated");
        } else {
          setStatus("offline");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // React to logout or a 401 from any admin API call
  useEffect(() => {
    const onChange = () => {
      if (!getAdminToken()) setStatus("unauthenticated");
    };
    window.addEventListener(AUTH_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AUTH_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (status === "unauthenticated") {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p style={{ color: "var(--stone-gray)" }}>Checking admin session...</p>
        </div>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Can't reach the server</h1>
          <p className="text-sm text-gray-600 mb-4">
            The admin session couldn't be verified because the backend isn't
            responding. Make sure it is running, then try again.
          </p>
          <button className="btn btn-primary" onClick={() => setStatus("checking")}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarAdmin />
      <Outlet />
    </div>
  );
}
