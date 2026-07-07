import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const token = getToken();

  useEffect(() => {
    if (!token && location !== "/login") {
      setLocation("/login");
    }
  }, [token, location, setLocation]);

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
