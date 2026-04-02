import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import PlanTrip from './pages/PlanTrip'

function App() {
  return (
    <div className="min-h-screen bg-[#F5F1ED] text-[#2E2E2E]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-6 md:py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<PlanTrip />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
