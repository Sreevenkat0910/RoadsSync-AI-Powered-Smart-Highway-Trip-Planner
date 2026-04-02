import { Link, NavLink } from 'react-router-dom'

function linkClass({ isActive }) {
  return isActive
    ? 'text-[#F5F1ED] font-medium underline underline-offset-4'
    : 'text-[#E8DCCF] hover:text-white'
}

export default function Navbar() {
  return (
    <header className="border-b border-[#5B3A3A] bg-[#4B2E2E] shadow-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-semibold tracking-wide text-white">
          RoadsSync
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/plan" className={linkClass}>
            Plan Trip
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

