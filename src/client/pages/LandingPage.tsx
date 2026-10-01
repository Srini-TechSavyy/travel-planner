import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthButton } from "../components/AuthButton";
import { ErrorMessage } from "../components/ErrorMessage";
import { useAuth } from "../hooks/useAuth";

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const authError = params.get("error");

  useEffect(() => {
    if (!loading && user) {
      navigate("/trips", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-2xl text-white shadow-sm"
          aria-hidden
        >
          ✈
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          TripMate
        </h1>
        <p className="mt-3 text-slate-600">
          Plan your trips. Keep everything in one place.
        </p>
        {authError && (
          <div className="mt-6 text-left">
            <ErrorMessage message="Sign in failed. Please try again." />
          </div>
        )}
        <div className="mt-10 flex justify-center">
          {!loading && !user && <AuthButton />}
          {loading && (
            <p className="text-sm text-slate-500">Checking session…</p>
          )}
        </div>
      </div>
    </div>
  );
}
