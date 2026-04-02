import { Link, NavLink } from 'react-router-dom'

function linkClass({ isActive }) {
  return isActive
    ? 'text-blue-600 font-medium'
    : 'text-slate-600 hover:text-slate-900'
}

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          RoadsSync
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/plan" className={linkClass}>
            Plan Trip
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

