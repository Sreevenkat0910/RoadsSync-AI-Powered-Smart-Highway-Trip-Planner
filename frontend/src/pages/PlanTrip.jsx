import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api, { getModelExplanation } from '../services/api'
import MapView from '../components/MapView'
import { getStopRecommendation } from '../utils/stopRecommendations'

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
  const [tripSubmitted, setTripSubmitted] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [liveScore, setLiveScore] = useState(null)
  const [preferredTime, setPreferredTime] = useState('')
  /** Preserved after submit so stop recommendations align with the chosen band. */
  const [submittedPreferredTime, setSubmittedPreferredTime] = useState('')
  const resultRef = useRef(null)

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  useEffect(() => {
    if (!result?.liveTraffic) {
      setLiveScore(null)
      return
    }

    const baseScore = Number(result.trafficScore || 0)
    setLiveScore(baseScore)

    // Optional live refresh: small UI-only jitter every 12s.
    const intervalId = setInterval(() => {
      const jitter = Math.floor(Math.random() * 5) - 2
      const next = Math.max(0, Math.min(100, baseScore + jitter))
      setLiveScore(next)
    }, 12000)

    return () => clearInterval(intervalId)
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
      setExplanation(null)

      const payload = {
        userId: Number(formData.userId),
        vehicleId: Number(formData.vehicleId),
        source: formData.source.trim(),
        destination: formData.destination.trim(),
        travelDate: formData.travelDate,
        preferredTime,
      }

      console.log('Sending preferredTime:', preferredTime)

      const response = await api.post('/trips/plan-trip', payload)
      setResult(response.data)
      setSubmittedPreferredTime(preferredTime || '')
      await loadExplanation(payload, response.data)
      setTripSubmitted(true)
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
      setPreferredTime('')
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

  const handleBackToForm = () => {
    setTripSubmitted(false)
    setSubmittedPreferredTime('')
  }

  const loadExplanation = async (requestPayload, tripResult) => {
    try {
      setExplainLoading(true)
      const travelDate = requestPayload.travelDate ? new Date(requestPayload.travelDate) : new Date()
      const dayOfWeek = travelDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
      const bestTimeText = tripResult?.bestDepartureTime || tripResult?.bestTime?.time || ''
      const bestHourMatch = bestTimeText.match(/(\d{1,2})/)
      const bestHour = bestHourMatch ? Number(bestHourMatch[1]) : 9

      const explainPayload = {
        hour: Number.isNaN(bestHour) ? 9 : bestHour,
        day_of_week: dayOfWeek,
        month: (travelDate.getMonth() || 0) + 1,
        is_weekend: dayOfWeek === 'SATURDAY' || dayOfWeek === 'SUNDAY' ? 1 : 0,
        is_holiday: 0,
        days_to_holiday: 5,
        route: `${requestPayload.source.slice(0, 3).toUpperCase()}-${requestPayload.destination.slice(0, 3).toUpperCase()}`,
      }

      const explainResponse = await getModelExplanation(explainPayload)
      setExplanation(explainResponse || null)
    } catch (error) {
      setExplanation(null)
    } finally {
      setExplainLoading(false)
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
  const displayedTrafficScore = result?.liveTraffic ? (liveScore ?? result?.trafficScore ?? 0) : result?.trafficScore
  const routeOptions = result?.routes || []
  const scoreBreakdownRoutes = Array.isArray(result?.scoreBreakdown?.routes)
    ? result.scoreBreakdown.routes
    : []
  const bestRouteName = result?.bestRoute?.routeName || null
  const bestLabelKey = result?.bestTime?.trafficLevel?.toLowerCase?.() || 'unknown'
  const departureAlternatives = useMemo(() => {
    const raw = Array.isArray(result?.alternatives) ? [...result.alternatives] : []
    return raw.sort((a, b) => (a.trafficScore ?? 0) - (b.trafficScore ?? 0))
  }, [result?.alternatives])
  const hasPreferredRange = Boolean(submittedPreferredTime && String(submittedPreferredTime).trim())
  const recommendedRouteIndex = routeOptions.reduce((bestIdx, route, idx) => {
    if (bestRouteName && route?.routeName === bestRouteName) return idx
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

  const trafficShortLabel = (level) => {
    const k = String(level || '').toLowerCase()
    if (k === 'high') return 'High'
    if (k === 'medium') return 'Medium'
    if (k === 'low') return 'Low'
    return 'Unknown'
  }

  const formatTollInr = (toll) => {
    const n = Number(toll)
    if (Number.isNaN(n)) return '₹0'
    return `₹${Math.round(n)}`
  }

  const routeLetter = (idx) => String.fromCharCode(65 + idx)

  const wt = result?.scoreBreakdown?.weightTraffic ?? 0.5
  const wd = result?.scoreBreakdown?.weightDistance ?? 0.3
  const wtol = result?.scoreBreakdown?.weightToll ?? 0.2
  const routeStackedChartData = scoreBreakdownRoutes.map((r, idx) => ({
    label: `Route ${routeLetter(idx)}`,
    traffic: Number((wt * (r.normalizedTraffic ?? 0)).toFixed(4)),
    distance: Number((wd * (r.normalizedDistance ?? 0)).toFixed(4)),
    toll: Number((wtol * (r.normalizedToll ?? 0)).toFixed(4)),
  }))
  const topFactors = Array.isArray(explanation?.top_factors) ? explanation.top_factors : []
  const maxImpact = topFactors.length > 0 ? Math.max(...topFactors.map((item) => item.impact || 0)) : 1
  const chartData = topFactors.map((item) => ({
    feature: item.feature,
    impact: Number((item.impact || 0).toFixed(4)),
    impactPct: Number((((item.impact || 0) / maxImpact) * 100).toFixed(1)),
  }))
  const toFeatureLabel = (name) =>
    String(name || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  const impactTag = (pct) => {
    if (pct >= 70) return 'High impact'
    if (pct >= 35) return 'Medium impact'
    return 'Low impact'
  }

  const stopRecommendation = useMemo(() => {
    if (!result) return null
    return getStopRecommendation({
      preferredTime: submittedPreferredTime,
      bestDepartureTime: result.bestDepartureTime || result.bestTime?.time,
    })
  }, [result, submittedPreferredTime])

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col gap-6">
      <div className="premium-card animate-[fadeIn_.35s_ease-out]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Route Preview</h2>
          {mapLoading && <span className="text-sm text-[#6B6B6B]">Loading route...</span>}
        </div>
        {routeInput.source && routeInput.destination ? (
          <MapView
            source={routeInput.source}
            destination={routeInput.destination}
            onRouteLoadingChange={setMapLoading}
          />
        ) : (
          <p className="text-sm text-[#6B6B6B]">
            Your route map will appear here after you submit source and destination.
          </p>
        )}
      </div>

      {tripSubmitted && (
        <div>
          <button type="button" onClick={handleBackToForm} className="coffee-button inline-flex items-center gap-2">
            <span aria-hidden="true">←</span>
            Back to Trip Form
          </button>
        </div>
      )}

      {!tripSubmitted && (
        <div className="premium-card animate-[fadeIn_.35s_ease-out] md:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#2E2E2E]">Plan Your Trip</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Fill in the details below to submit a new trip plan request.
          </p>
          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <label htmlFor="userId" className="mb-1 block text-sm font-medium text-[#6B6B6B]">
                User ID
              </label>
              <input
                id="userId"
                name="userId"
                type="number"
                required
                value={formData.userId}
                onChange={handleChange}
                className="coffee-input"
                placeholder="Enter user ID"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="vehicleId" className="mb-1 block text-sm font-medium text-[#6B6B6B]">
                Vehicle ID
              </label>
              <input
                id="vehicleId"
                name="vehicleId"
                type="number"
                required
                value={formData.vehicleId}
                onChange={handleChange}
                className="coffee-input"
                placeholder="Enter vehicle ID"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="source" className="mb-1 block text-sm font-medium text-[#6B6B6B]">
                Source
              </label>
              <input
                id="source"
                name="source"
                type="text"
                required
                value={formData.source}
                onChange={handleChange}
                className="coffee-input"
                placeholder="e.g. Hyderabad"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="destination" className="mb-1 block text-sm font-medium text-[#6B6B6B]">
                Destination
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                required
                value={formData.destination}
                onChange={handleChange}
                className="coffee-input"
                placeholder="e.g. Vijayawada"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="travelDate" className="mb-1 block text-sm font-medium text-[#6B6B6B]">
                Travel Date
              </label>
              <input
                id="travelDate"
                name="travelDate"
                type="date"
                required
                value={formData.travelDate}
                onChange={handleChange}
                className="coffee-input"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="preferredTime" className="mb-1 block text-sm font-medium text-[#6B6B6B]">
                Preferred Time
              </label>
              <select
                id="preferredTime"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="coffee-input w-full appearance-none bg-[#FCFAF8]"
              >
                <option value="">No preference</option>
                <option value="midnight">Midnight</option>
                <option value="early morning">Early Morning</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="coffee-button w-full py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Calculating traffic...' : 'Submit Trip'}
              </button>
            </div>
          </form>
        </div>
      )}

      {result && (
        <div
          ref={resultRef}
          className="premium-card animate-[fadeIn_.35s_ease-out] md:p-8"
        >
          <h2 className="text-xl font-semibold text-[#2E2E2E]">Prediction Result</h2>
          <p className="mt-1 text-sm text-[#6B6B6B]">Based on predicted traffic patterns</p>
          {result.liveTraffic && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-[#C4A484]/60 bg-[#F7F1EA] px-4 py-2">
              <p className="text-sm font-medium text-[#6F4E37]">Live Traffic Data Active</p>
              <span className="rounded-full bg-[#6F4E37] px-2.5 py-1 text-xs font-semibold tracking-wide text-white">
                LIVE
              </span>
            </div>
          )}

          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-medium">Traffic Level:</span>{' '}
              <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${levelBadgeClass}`}>
                {result.trafficLevel}
              </span>
            </p>
            <p>
              <span className="font-medium">Traffic Score:</span> {displayedTrafficScore}
            </p>
            <p>
              <span className="font-medium">Trip ID:</span> {result.tripId}
            </p>
          </div>

          {result &&
            (result.bestOverallTime != null ||
              (result.bestPreferredTime != null && String(result.bestPreferredTime).trim() !== '')) && (
            <div className="mt-6 rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">Departure times</h3>
              <div
                className={`mt-4 grid grid-cols-1 gap-4 ${
                  result.bestOverallTime != null && result.bestPreferredTime != null ? 'md:grid-cols-2' : ''
                }`}
              >
                {result.bestOverallTime != null && (
                  <div className="rounded-lg border border-[#E9DFD7] bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6F4E37]">Best overall</p>
                    <p className="mt-2 text-xl font-semibold text-[#2E2E2E]">{result.bestOverallTime}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6B6B6B]">
                      Best departure time across all standard hourly slots we evaluate (full day grid).
                    </p>
                  </div>
                )}
                {result.bestPreferredTime != null && String(result.bestPreferredTime).trim() !== '' && (
                  <div className="rounded-lg border border-[#C4A484]/60 bg-[#F7F1EA] px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6F4E37]">Best in your selected range</p>
                    <p className="mt-2 text-xl font-semibold text-[#2E2E2E]">{result.bestPreferredTime}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6B6B6B]">
                      Best departure time within your preferred time band only (e.g. morning vs overnight).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.bestDepartureTime && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">
                Departure Recommendations
              </h3>
              {hasPreferredRange && (
                <p className="mt-1 text-xs text-[#6B6B6B]">
                  Times below are only from your preferred band (e.g. morning excludes 4:00 AM options).
                </p>
              )}
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6F4E37]">
                    {hasPreferredRange ? 'Best Time in Your Selected Range' : 'Best departure time'}
                  </p>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-[#C4A484]/60 bg-[#F7F1EA] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#6B6B6B]">Best</p>
                      <p className="font-semibold text-[#2E2E2E]">{result.bestDepartureTime}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${levelClassMap[bestLabelKey] || levelClassMap.unknown}`}>
                      {levelLabelMap[bestLabelKey] || 'Unknown Traffic'}
                    </span>
                  </div>
                </div>

                {departureAlternatives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6F4E37]">
                      {hasPreferredRange ? 'Other Options in This Time Range' : 'Other departure options'}
                    </p>
                    <div className="mt-2 space-y-2">
                      {departureAlternatives.map((opt, idx) => {
                        const optKey = opt.trafficLevel?.toLowerCase?.() || 'unknown'
                        return (
                          <div
                            key={`${opt.time}-${idx}`}
                            className="flex items-center justify-between rounded-lg border border-[#E9DFD7] bg-[#FCFAF8] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-[#6B6B6B]">Alternative</p>
                              <p className="font-medium text-[#2E2E2E]">{opt.time}</p>
                            </div>
                            <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${levelClassMap[optKey] || levelClassMap.unknown}`}>
                              {levelLabelMap[optKey] || 'Unknown Traffic'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {stopRecommendation && (
            <div className="mt-6 rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">
                Recommended Stops for Your Journey
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {stopRecommendation.icons.map((icon, idx) => (
                  <span
                    key={`${icon}-${idx}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E9DFD7] bg-[#F7F1EA] text-xl"
                    aria-hidden
                  >
                    {icon}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold text-[#4B2E2E]">{stopRecommendation.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">{stopRecommendation.sentence}</p>
            </div>
          )}

          {result.leaveNow && result.bestTime && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">
                Traffic Comparison
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4">
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

                <div className="rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4">
                  <p className="text-sm font-semibold text-slate-900">Best Time</p>
                  <p className="mt-2 text-base font-semibold text-[#4B2E2E]">
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

              <div className="mt-4 rounded-xl border border-[#C4A484]/60 bg-[#F7F1EA] p-4">
                <p className="text-sm font-semibold text-[#6F4E37]">
                  You save {result.timeSaved || 0} minutes by leaving at best time
                </p>
              </div>
            </div>
          )}

          {routeOptions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">Route comparison</h3>
              <p className="mt-1 text-sm text-[#6B6B6B]">
                Traffic, distance, and estimated toll — compared side by side.
              </p>

              {(result.bestRoute || result.scoreBreakdown) && (
                <div className="mt-4 rounded-xl border border-[#C4A484]/70 bg-[#F7F1EA] px-4 py-3">
                  <p className="text-center text-sm font-semibold text-[#4B2E2E]">
                    Best Route Selected based on multiple factors
                  </p>
                  <p className="mt-1 text-center text-xs text-[#6B6B6B]">
                    Weighted score: 50% traffic · 30% distance · 20% toll (lower is better)
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {routeOptions.map((route, idx) => {
                  const routeLevelKey = route.trafficLevel?.toLowerCase?.() || 'unknown'
                  const routeClass = levelClassMap[routeLevelKey] || levelClassMap.unknown
                  const isBest =
                    Boolean(bestRouteName && route?.routeName === bestRouteName) ||
                    (!bestRouteName && idx === recommendedRouteIndex)
                  return (
                    <div
                      key={`${route.routeName}-${idx}`}
                      className={`rounded-xl border p-4 transition-shadow ${
                        isBest ? 'border-[#6F4E37] bg-[#F7F1EA] shadow-sm ring-1 ring-[#C4A484]/50' : 'border-[#E9DFD7] bg-[#FCFAF8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#6F4E37]">
                            Route {routeLetter(idx)}
                          </p>
                          <p className="text-sm font-semibold text-[#2E2E2E]">{route.routeName || `Option ${idx + 1}`}</p>
                        </div>
                        {isBest && (
                          <span className="shrink-0 rounded-full bg-[#6F4E37] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            Best
                          </span>
                        )}
                      </div>
                      <ul className="mt-4 space-y-2 border-t border-[#E9DFD7] pt-3 text-sm text-[#2E2E2E]">
                        <li className="flex justify-between gap-3">
                          <span className="text-[#6B6B6B]">Traffic</span>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${routeClass}`}>
                            {trafficShortLabel(route.trafficLevel)}
                          </span>
                        </li>
                        <li className="flex justify-between gap-3">
                          <span className="text-[#6B6B6B]">Distance</span>
                          <span className="font-medium">{route.distanceKm ?? 0} km</span>
                        </li>
                        <li className="flex justify-between gap-3">
                          <span className="text-[#6B6B6B]">Toll</span>
                          <span className="font-medium tabular-nums">{formatTollInr(route.tollCost)}</span>
                        </li>
                        <li className="flex justify-between gap-3 text-xs text-[#6B6B6B]">
                          <span>Duration</span>
                          <span>{route.durationMinutes ?? 0} mins</span>
                        </li>
                      </ul>
                    </div>
                  )
                })}
              </div>

              {routeStackedChartData.length > 0 && (
                <div className="mt-6 rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">
                    Score mix (weighted normalized factors)
                  </p>
                  <div className="mt-3 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={routeStackedChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9DFD7" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#6B6B6B', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} domain={[0, 1]} />
                        <Tooltip
                          formatter={(value) => [Number(value).toFixed(3), '']}
                          contentStyle={{ borderRadius: '12px', borderColor: '#E9DFD7' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="traffic" name="Traffic (50%)" stackId="mix" fill="#6F4E37" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="distance" name="Distance (30%)" stackId="mix" fill="#C4A484" />
                        <Bar dataKey="toll" name="Toll (20%)" stackId="mix" fill="#E9DFD7" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">Why traffic is high?</h3>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Explainable AI factors from the Random Forest model.
            </p>

            {explainLoading && (
              <div className="mt-3 rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4 text-sm text-[#6B6B6B]">
                Computing feature importance...
              </div>
            )}

            {!explainLoading && chartData.length > 0 && (
              <>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {chartData.slice(0, 2).map((item) => (
                    <div key={item.feature} className="rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] px-4 py-3">
                      <p className="text-sm font-medium text-[#2E2E2E]">{toFeatureLabel(item.feature)}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6F4E37]">
                        {impactTag(item.impactPct)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 h-64 rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E9DFD7" />
                      <XAxis dataKey="feature" tick={{ fill: '#6B6B6B', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) => [value, name === 'impact' ? 'Impact' : name]}
                        contentStyle={{ borderRadius: '12px', borderColor: '#E9DFD7' }}
                      />
                      <Bar dataKey="impact" fill="#6F4E37" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {!explainLoading && chartData.length === 0 && (
              <div className="mt-3 rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4 text-sm text-[#6B6B6B]">
                Explainability data is currently unavailable.
              </div>
            )}
          </div>
        </div>
      )}

    </section>
  )
}

