import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import MapView from '../components/MapView'

export default function PlanTrip() {
  const [formData, setFormData] = useState({
    userId: '',
    vehicleId: '',
    source: '',
    destination: '',
    travelDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [routeInput, setRouteInput] = useState({ source: '', destination: '' })
  const [mapLoading, setMapLoading] = useState(false)
  const resultRef = useRef(null)

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const hasEmptyField = Object.values(formData).some((value) => String(value).trim() === '')
    if (hasEmptyField) {
      alert('Please fill in all fields before submitting.')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')
      setResult(null)

      const payload = {
        userId: Number(formData.userId),
        vehicleId: Number(formData.vehicleId),
        source: formData.source.trim(),
        destination: formData.destination.trim(),
        travelDate: formData.travelDate,
      }

      const response = await api.post('/trips/plan-trip', payload)
      setResult(response.data)
      setRouteInput({
        source: payload.source,
        destination: payload.destination,
      })

      setFormData({
        userId: '',
        vehicleId: '',
        source: '',
        destination: '',
        travelDate: '',
      })
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message)
      } else if (error.response?.status) {
        setErrorMessage(`Request failed with status ${error.response.status}`)
      } else {
        setErrorMessage('Network error: Unable to connect to backend')
      }
    } finally {
      setLoading(false)
    }
  }

  const levelClassMap = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
    unknown: 'bg-slate-100 text-slate-700',
  }
  const levelTextClassMap = {
    low: 'text-green-700',
    medium: 'text-yellow-700',
    high: 'text-red-700',
    unknown: 'text-slate-700',
  }
  const levelLabelMap = {
    low: 'Low Traffic',
    medium: 'Medium Traffic',
    high: 'High Traffic',
    unknown: 'Unknown Traffic',
  }
  const levelKey = result?.trafficLevel?.toLowerCase?.() || 'unknown'
  const levelBadgeClass = levelClassMap[levelKey] || levelClassMap.unknown
  const routeOptions = result?.routes || []
  const recommendedRouteIndex = routeOptions.reduce((bestIdx, route, idx) => {
    if (bestIdx === -1) return idx
    const currentBest = routeOptions[bestIdx]
    const routeScore = route?.trafficScore ?? Number.MAX_SAFE_INTEGER
    const bestScore = currentBest?.trafficScore ?? Number.MAX_SAFE_INTEGER
    if (routeScore < bestScore) return idx
    if (routeScore === bestScore) {
      const routeDuration = route?.durationMinutes ?? Number.MAX_SAFE_INTEGER
      const bestDuration = currentBest?.durationMinutes ?? Number.MAX_SAFE_INTEGER
      if (routeDuration < bestDuration) return idx
    }
    return bestIdx
  }, -1)

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col gap-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Plan Your Trip</h1>
        <p className="mt-2 text-sm text-slate-600">
          Fill in the details below to submit a new trip plan request.
        </p>
        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label htmlFor="userId" className="mb-1 block text-sm font-medium text-slate-700">
              User ID
            </label>
            <input
              id="userId"
              name="userId"
              type="number"
              required
              value={formData.userId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter user ID"
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="vehicleId" className="mb-1 block text-sm font-medium text-slate-700">
              Vehicle ID
            </label>
            <input
              id="vehicleId"
              name="vehicleId"
              type="number"
              required
              value={formData.vehicleId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter vehicle ID"
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="source" className="mb-1 block text-sm font-medium text-slate-700">
              Source
            </label>
            <input
              id="source"
              name="source"
              type="text"
              required
              value={formData.source}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Hyderabad"
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="destination" className="mb-1 block text-sm font-medium text-slate-700">
              Destination
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              required
              value={formData.destination}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Vijayawada"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="travelDate" className="mb-1 block text-sm font-medium text-slate-700">
              Travel Date
            </label>
            <input
              id="travelDate"
              name="travelDate"
              type="date"
              required
              value={formData.travelDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Calculating traffic...' : 'Submit Trip'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div
          ref={resultRef}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h2 className="text-xl font-semibold text-slate-900">Prediction Result</h2>
          <p className="mt-1 text-sm text-slate-600">Based on predicted traffic patterns</p>

          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-medium">Traffic Level:</span>{' '}
              <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${levelBadgeClass}`}>
                {result.trafficLevel}
              </span>
            </p>
            <p>
              <span className="font-medium">Traffic Score:</span> {result.trafficScore}
            </p>
            <p>
              <span className="font-medium">Trip ID:</span> {result.tripId}
            </p>
          </div>

          {result.bestDepartureTime && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-green-700">
                Recommended Departure Time
              </h3>
              <div className="mt-2 flex items-center gap-2 text-green-800">
                <span className="text-xl">✅</span>
                <p className="text-2xl font-bold">{result.bestDepartureTime}</p>
              </div>
            </div>
          )}

          {result.bestDepartureTime && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Other Options
              </h3>
              <div className="mt-3 space-y-3">
                {(result.alternatives || []).map((option, idx) => {
                  const optionKey = option.trafficLevel?.toLowerCase?.() || 'unknown'
                  const optionClass = levelClassMap[optionKey] || levelClassMap.unknown
                  const optionLabel =
                    optionKey === 'low'
                      ? 'Low Traffic'
                      : optionKey === 'medium'
                        ? 'Medium Traffic'
                        : optionKey === 'high'
                          ? 'High Traffic'
                          : 'Unknown Traffic'

                  return (
                    <div
                      key={`${option.time}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <p className="font-medium text-slate-800">{option.time}</p>
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${optionClass}`}>
                          {optionLabel}
                        </span>
                        <span className="text-xs text-slate-600">Score: {option.trafficScore}</span>
                      </div>
                    </div>
                  )
                })}
                {(result.alternatives || []).length === 0 && (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No alternatives available.
                  </p>
                )}
              </div>
            </div>
          )}

          {result.leaveNow && result.bestTime && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Traffic Comparison
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Leave Now</p>
                  <p
                    className={`mt-2 text-base font-medium ${
                      levelTextClassMap[result.leaveNow.trafficLevel?.toLowerCase?.() || 'unknown']
                    }`}
                  >
                    {levelLabelMap[result.leaveNow.trafficLevel?.toLowerCase?.() || 'unknown']} ❌
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Delay: <span className="font-semibold">+{result.leaveNow.delay || 0} mins</span>
                  </p>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Best Time</p>
                  <p className="mt-2 text-base font-semibold text-green-800">
                    {result.bestTime.time || result.bestDepartureTime || 'Not available'} ✅
                  </p>
                  <p
                    className={`mt-1 text-base font-medium ${
                      levelTextClassMap[result.bestTime.trafficLevel?.toLowerCase?.() || 'unknown']
                    }`}
                  >
                    {levelLabelMap[result.bestTime.trafficLevel?.toLowerCase?.() || 'unknown']}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Delay: <span className="font-semibold">+{result.bestTime.delay || 0} mins</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  You save {result.timeSaved || 0} minutes by leaving at best time
                </p>
              </div>
            </div>
          )}

          {routeOptions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Route Options</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                {routeOptions.map((route, idx) => {
                  const routeLevelKey = route.trafficLevel?.toLowerCase?.() || 'unknown'
                  const routeClass = levelClassMap[routeLevelKey] || levelClassMap.unknown
                  const isRecommended = idx === recommendedRouteIndex
                  return (
                    <div
                      key={`${route.routeName}-${idx}`}
                      className={`rounded-xl border p-4 ${
                        isRecommended ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{route.routeName || `Route ${idx + 1}`}</p>
                        {isRecommended && (
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p>Distance: {route.distanceKm ?? 0} km</p>
                        <p>Duration: {route.durationMinutes ?? 0} mins</p>
                        <p>
                          Traffic:{' '}
                          <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${routeClass}`}>
                            {levelLabelMap[routeLevelKey] || 'Unknown Traffic'}
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {routeInput.source && routeInput.destination && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Route Preview</h2>
            {mapLoading && (
              <span className="text-sm text-slate-500">Loading route...</span>
            )}
          </div>
          <MapView
            source={routeInput.source}
            destination={routeInput.destination}
            stops={result?.stops || []}
            onRouteLoadingChange={setMapLoading}
          />
        </div>
      )}
    </section>
  )
}

