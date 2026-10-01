import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition ${
    isActive ? "text-teal-700" : "text-slate-600 hover:text-teal-600"
  }`;

export function Header() {
  const { user } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            ✈
          </span>
          TripMate
        </Link>
        <nav className="flex flex-wrap items-center gap-4 sm:gap-6">
          <NavLink to="/" className={navClass} end>
            My Trips
          </NavLink>
          <NavLink to="/trips/new" className={navClass}>
            New Trip
          </NavLink>
          {user ? (
            <NavLink to="/account" className={navClass}>
              <span className="flex items-center gap-2">
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded-full"
                  />
                )}
                {user.name ?? "Account"}
              </span>
            </NavLink>
          ) : (
            <a href="/auth/google" className="btn-primary py-2 text-sm">
              Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
