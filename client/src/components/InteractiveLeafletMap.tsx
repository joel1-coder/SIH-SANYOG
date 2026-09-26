import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "@shared/types";
import { MapPin, Navigation } from "lucide-react";

// Fix standard Leaflet default icon issues in bundlers
const customPinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const activePinIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  location: Location;
  onChange: (loc: Location) => void;
  height?: string;
  readonly?: boolean;
  markers?: Array<{
    id: string;
    title: string;
    location: Location;
    status?: string;
    priority?: string;
  }>;
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function InteractiveLeafletMap({
  location,
  onChange,
  height = "320px",
  readonly = false,
  markers = [],
}: LocationPickerProps) {
  const [coords, setCoords] = useState<[number, number]>([
    location.lat && location.lat !== 0 ? location.lat : 19.076, // Default: Mumbai / Maharashtra center
    location.lng && location.lng !== 0 ? location.lng : 72.8777,
  ]);
  const [addressName, setAddressName] = useState(location.address || "Maharashtra, India");
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (location.lat && location.lng && (location.lat !== coords[0] || location.lng !== coords[1])) {
      setCoords([location.lat, location.lng]);
    }
  }, [location.lat, location.lng]);

  const handleMapClick = async (lat: number, lng: number) => {
    if (readonly) return;
    setCoords([lat, lng]);
    setGeocoding(true);

    try {
      // Free OpenStreetMap Nominatim reverse geocoding
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { "User-Agent": "Sanyog-Citizen-Portal/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAddressName(display);
        onChange({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), address: display });
      } else {
        const fallback = `Geo-tag (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setAddressName(fallback);
        onChange({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), address: fallback });
      }
    } catch {
      const fallback = `Geo-tag (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setAddressName(fallback);
      onChange({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), address: fallback });
    } finally {
      setGeocoding(false);
    }
  };

  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleMapClick(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div style={{ height, width: "100%" }}>
        <MapContainer
          center={coords}
          zoom={11}
          style={{ height: "100%", width: "100%", zIndex: 10 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!readonly && <MapClickHandler onSelect={handleMapClick} />}

          {/* Primary selected location */}
          <Marker position={coords} icon={activePinIcon}>
            <Popup>
              <div className="text-xs font-medium">
                <p className="font-semibold text-slate-800">Selected Point</p>
                <p className="text-slate-600">{addressName}</p>
                <p className="text-slate-400 mt-1">{coords[0].toFixed(4)}, {coords[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>

          {/* Additional report clusters/markers */}
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={[m.location.lat || 19.076, m.location.lng || 72.8777]}
              icon={customPinIcon}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold text-blue-800">{m.title}</p>
                  <p className="text-slate-600">{m.location.address}</p>
                  {m.status && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
                      {m.status}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {!readonly && (
        <div className="bg-slate-50 border-t border-slate-200 p-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 truncate max-w-[75%]">
            <MapPin size={14} className="text-blue-600 shrink-0" />
            <span className="truncate font-medium">
              {geocoding ? "Detecting address..." : addressName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded shadow-xs text-xs shrink-0 cursor-pointer"
            title="Use current GPS location"
          >
            <Navigation size={12} className="text-blue-600" />
            My Location
          </button>
        </div>
      )}
    </div>
  );
}
