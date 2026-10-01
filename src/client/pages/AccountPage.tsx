import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Account</h1>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-800">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-slate-900">{user.name ?? "Traveler"}</p>
            <p className="text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-8 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
