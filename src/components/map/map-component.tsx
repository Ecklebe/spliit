import { ExpenseFormValues } from '@/lib/schemas'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import React, { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import MapSection from './map-section'
import './map-styles.css'
import LocationMarker from './marker'
import { MapSectionType } from './types'

// leaflet-defaulticon-compatibility's bundled CSS uses webpack-only `~module`
// url() imports, which Turbopack (this app's build tool) can't resolve. Fix
// the default-icon-path issue directly instead, per react-leaflet's own
// documented workaround: https://react-leaflet.js.org/docs/start-setup/
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src ?? iconRetinaUrl,
  iconUrl: iconUrl.src ?? iconUrl,
  shadowUrl: shadowUrl.src ?? shadowUrl,
})

const noLocationMapSection: MapSectionType = {
  location: { latitude: 0, longitude: 0 },
  zoom: 1,
}

const DEFAULT_ZOOM_ON_LOCATION = 13

type MapProps = {
  location: ExpenseFormValues['location']
  updateLocation: (location: ExpenseFormValues['location']) => void
}

const Map: React.FC<MapProps> = ({ location, updateLocation }) => {
  const [marker, setMarker] = useState(location)
  const [mapSection, setMapSection] = useState<MapSectionType>(
    location
      ? { location, zoom: DEFAULT_ZOOM_ON_LOCATION }
      : noLocationMapSection,
  )

  const isExpenseLocationDivergedFromMarker = (
    location: ExpenseFormValues['location'],
    marker: ExpenseFormValues['location'],
  ): boolean =>
    location?.latitude !== marker?.latitude ||
    location?.longitude !== marker?.longitude

  if (isExpenseLocationDivergedFromMarker(location, marker)) {
    setMarker(location)
    if (location) {
      setMapSection({ location, zoom: DEFAULT_ZOOM_ON_LOCATION })
    } else {
      setMapSection(noLocationMapSection)
    }
  }

  function onMarkerMoved(
    location: Exclude<ExpenseFormValues['location'], null>,
  ) {
    setMarker(location)
    updateLocation(location)
  }

  return (
    <MapContainer style={{ height: '40vh', zIndex: 0 }} className="map-tiles">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapSection section={mapSection} updateSection={setMapSection} />
      <LocationMarker location={location} updateLocation={onMarkerMoved} />
    </MapContainer>
  )
}

export default Map
