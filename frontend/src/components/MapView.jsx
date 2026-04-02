import { useEffect, useMemo, useState } from 'react'
import { GoogleMap, PolylineF, useJsApiLoader } from '@react-google-maps/api'

const INDIA_CENTER = { lat: 22.9734, lng: 78.6569 }

export default function MapView({ source, destination, onRouteLoadingChange }) {
  const [directions, setDirections] = useState(null)
  const [routes, setRoutes] = useState([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [routeError, setRouteError] = useState('')

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  })

  const mapCenter = useMemo(() => INDIA_CENTER, [])
  const selectedRoute = routes[selectedRouteIndex]

  useEffect(() => {
    console.log('Selected route:', selectedRouteIndex)
  }, [selectedRouteIndex])

  useEffect(() => {
    if (onRouteLoadingChange) {
      onRouteLoadingChange(false)
    }
  }, [onRouteLoadingChange])

  useEffect(() => {
    let active = true

    async function fetchDirections() {
      if (!isLoaded || !window.google || !source || !destination) return

      try {
        setRouteError('')
        setDirections(null)
        setRoutes([])
        onRouteLoadingChange?.(true)

        const service = new window.google.maps.DirectionsService()
        const result = await service.route({
          origin: source,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        })

        if (!active) return
        setDirections(result)
        setRoutes(result.routes || [])
      } catch (error) {
        if (!active) return
        setRoutes([])
        setRouteError('Unable to find route. Please verify source and destination.')
      } finally {
        if (active) {
          onRouteLoadingChange?.(false)
        }
      }
    }

    fetchDirections()
    return () => {
      active = false
    }
  }, [isLoaded, source, destination, onRouteLoadingChange])

  const formatDistance = (meters) => {
    const km = (meters || 0) / 1000
    return `${Math.round(km)} km`
  }

  const formatDuration = (seconds) => {
    const totalMinutes = Math.round((seconds || 0) / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) {
      return `${minutes}m`
    }
    if (minutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${minutes}m`
  }

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Google Maps key missing. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>frontend/.env</code>.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Failed to load Google Maps. Check API key restrictions and billing settings.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading Google Maps...
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '420px' }}
        center={mapCenter}
        zoom={5}
        options={{ streetViewControl: false, mapTypeControl: false }}
      >
        {routes.map((route, index) => (
          <PolylineF
            key={`route-${index}`}
            path={index === selectedRouteIndex ? selectedRoute?.overview_path : route.overview_path}
            options={{
              strokeColor: index === selectedRouteIndex ? '#2563EB' : '#9CA3AF',
              strokeOpacity: index === selectedRouteIndex ? 0.95 : 0.65,
              strokeWeight: index === selectedRouteIndex ? 6 : 4,
              zIndex: index === selectedRouteIndex ? 2 : 1,
            }}
            onClick={() => {
              console.log('Clicked:', index)
              setSelectedRouteIndex(index)
            }}
          />
        ))}
        {/* TODO: Re-enable stops using Google Places API */}
      </GoogleMap>

      {routeError && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {routeError}
        </div>
      )}
      {!routeError && routes.length > 0 && (
        <div className="border-t border-[#E9DFD7] bg-[#FCFAF8] px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">Route Alternatives</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {routes.map((route, index) => (
              <button
                key={`route-toggle-${index}`}
                type="button"
                onClick={() => {
                  console.log('Clicked:', index)
                  setSelectedRouteIndex(index)
                }}
                className={`cursor-pointer rounded-xl border p-4 text-left text-xs font-medium transition hover:shadow-lg ${
                  index === selectedRouteIndex
                    ? 'border-blue-500 bg-blue-100 shadow-md text-[#1E3A8A]'
                    : 'border-gray-300 bg-white text-[#4B5563]'
                }`}
              >
                <p className="font-semibold">{route.summary || `Route ${index + 1}`}</p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  {formatDistance(route.legs?.[0]?.distance?.value)} - {formatDuration(route.legs?.[0]?.duration?.value)}
                </p>
              </button>
            ))}
          </div>
          {selectedRoute && (
            <div className="mt-3 rounded-lg border border-[#C4A484]/50 bg-[#F7F1EA] px-3 py-2 text-sm text-[#4B2E2E]">
              <span className="font-semibold">Selected Route:</span>{' '}
              {formatDistance(selectedRoute.legs?.[0]?.distance?.value)} - {formatDuration(selectedRoute.legs?.[0]?.duration?.value)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

