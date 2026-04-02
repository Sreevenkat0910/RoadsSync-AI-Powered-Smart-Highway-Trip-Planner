import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import PlanTrip from './pages/PlanTrip'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<PlanTrip />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
