import { useEffect, useMemo, useState } from 'react'
import { DirectionsRenderer, GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api'

const INDIA_CENTER = { lat: 22.9734, lng: 78.6569 }

export default function MapView({ source, destination, stops = [], onRouteLoadingChange }) {
  const [directions, setDirections] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [selectedStopIndex, setSelectedStopIndex] = useState(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  })

  const mapCenter = useMemo(() => INDIA_CENTER, [])

  useEffect(() => {
    if (onRouteLoadingChange) {
      onRouteLoadingChange(false)
    }
  }, [onRouteLoadingChange])

  useEffect(() => {
    setSelectedStopIndex(null)
  }, [source, destination, stops])

  useEffect(() => {
    let active = true

    async function fetchDirections() {
      if (!isLoaded || !window.google || !source || !destination) return

      try {
        setRouteError('')
        setDirections(null)
        onRouteLoadingChange?.(true)

        const service = new window.google.maps.DirectionsService()
        const result = await service.route({
          origin: source,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        })

        if (!active) return
        setDirections(result)
      } catch (error) {
        if (!active) return
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

  const stopMarkers = useMemo(() => {
    if (!stops || stops.length === 0) return []

    const fallbackMarkers = stops.map((stop, index) => ({
      ...stop,
      position: {
        lat: INDIA_CENTER.lat + 0.25 * (index + 1),
        lng: INDIA_CENTER.lng + (index % 2 === 0 ? 0.35 : -0.35),
      },
    }))

    if (!directions?.routes?.[0]?.overview_path?.length) {
      return fallbackMarkers
    }

    const route = directions.routes[0]
    const path = route.overview_path
    const routeDistanceKm = (route.legs?.[0]?.distance?.value || 0) / 1000
    const maxStopKm = Math.max(...stops.map((stop) => stop.distanceFromStart || 0), 1)
    const denominator = routeDistanceKm > 0 ? routeDistanceKm : maxStopKm

    return stops.map((stop) => {
      const ratio = Math.max(0, Math.min(1, (stop.distanceFromStart || 0) / denominator))
      const pathIndex = Math.min(path.length - 1, Math.max(0, Math.round(ratio * (path.length - 1))))
      const point = path[pathIndex]

      return {
        ...stop,
        position: {
          lat: point.lat(),
          lng: point.lng(),
        },
      }
    })
  }, [directions, stops])

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
        {directions && <DirectionsRenderer directions={directions} />}
        {stopMarkers.length > 0 &&
          stopMarkers.map((stop, index) => (
            <MarkerF
              key={`${stop.type}-${stop.name}-${index}`}
              position={stop.position}
              label={{
                text: stop.type === 'fuel' ? '⛽' : '🍔',
                fontSize: '16px',
              }}
              title={`${stop.name} (${stop.type})`}
              onClick={() => setSelectedStopIndex(index)}
            />
          ))}

        {selectedStopIndex !== null && stopMarkers[selectedStopIndex] && (
          <InfoWindowF
            position={stopMarkers[selectedStopIndex].position}
            onCloseClick={() => setSelectedStopIndex(null)}
          >
            <div className="text-sm">
              <p className="font-semibold">{stopMarkers[selectedStopIndex].name}</p>
              <p>Type: {stopMarkers[selectedStopIndex].type}</p>
              <p>Distance: {stopMarkers[selectedStopIndex].distanceFromStart} km</p>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {routeError && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {routeError}
        </div>
      )}
    </div>
  )
}

