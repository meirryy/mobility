// Initialize Leaflet map
const map = L.map('map', {
  zoomControl: false,
  attributionControl: true
}).setView([42.2808, -83.7430], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
  detectRetina: true
}).addTo(map);

let routeLayers = [];

function clearRoutes() {
  routeLayers.forEach(layer => map.removeLayer(layer));
  routeLayers = [];
}

function drawRoute(geojson, color) {
  const layer = L.geoJSON(geojson, {
    style: { color: color, weight: 5, opacity: 0.7 }
  }).addTo(map);
  routeLayers.push(layer);
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.length === 0) throw new Error("Location not found");
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

async function getRoute(start, end, profile) {
  const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdiZWE3MzVmOTFmZjRmMjlhYTRhZDgxMGZiYTQyYjcwIiwiaCI6Im11cm11cjY0In0=";
  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  const body = {
    coordinates: [
      [start[1], start[0]],
      [end[1], end[0]]
    ]
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Mapbox Geocoder
mapboxgl.accessToken = 'pk.eyJ1IjoibWVpcnJ5IiwiYSI6ImNtZDVqNW5yYjAwNWUyaXBxNnVxdnNwbWwifQ.7JH45nsFVDMECiBdhatvVw';

const startGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Start location",
  mapboxgl,
  marker: false
});
const endGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Destination",
  mapboxgl,
  marker: false
});

document.getElementById('start-geocoder').appendChild(startGeocoder.onAdd(map));
document.getElementById('end-geocoder').appendChild(endGeocoder.onAdd(map));

let startCoords = null;
let endCoords = null;
let selectingFromMap = false;
let activeField = null;
let clickMarker = null;

// Set coords on result
startGeocoder.on('result', e => {
  startCoords = [e.result.center[1], e.result.center[0]];
});
endGeocoder.on('result', e => {
  endCoords = [e.result.center[1], e.result.center[0]];
});

startGeocoder.on('clear', () => { startCoords = null; });
endGeocoder.on('clear', () => { endCoords = null; });

// Focus → show dropdown
function enableMapDropdown(input, field) {
  input.addEventListener('focus', () => {
    activeField = field;
    const dropdown = document.createElement('div');
    dropdown.textContent = "📍 Double click on map to select location";
    dropdown.style.position = 'absolute';
    dropdown.style.background = '#1a1a1a';
    dropdown.style.color = '#fff';
    dropdown.style.padding = '8px';
    dropdown.style.cursor = 'pointer';
    dropdown.style.zIndex = 999;

    const rect = input.getBoundingClientRect();
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.width = `${rect.width}px`;

    dropdown.addEventListener('click', () => {
      selectingFromMap = true;
      dropdown.remove();
      alert("Now double-click on the map to choose a location.");
    });

    document.body.appendChild(dropdown);

    // Auto close on outside click
    const removeIfClickOutside = e => {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.remove();
        document.removeEventListener('click', removeIfClickOutside);
      }
    };
    document.addEventListener('click', removeIfClickOutside);
  });
}

setTimeout(() => {
  const startInput = document.querySelector('#start-geocoder input');
  const endInput = document.querySelector('#end-geocoder input');
  if (startInput && endInput) {
    enableMapDropdown(startInput, 'start');
    enableMapDropdown(endInput, 'end');
  }
}, 1000);

// Map double-click to select coords
map.on('dblclick', async (e) => {
  if (!selectingFromMap || !activeField) return;

  const { lat, lng } = e.latlng;
  if (clickMarker) map.removeLayer(clickMarker);
  clickMarker = L.marker([lat, lng]).addTo(map);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await res.json();
   const a = data.address;
const address = [
  a.house_number
  a.road,
  a.city || a.town || a.village,
  a.state
  a.postcode,
  a.country
].filter(Boolean).join(', ');
    const input = document.querySelector(`#${activeField}-geocoder input`);
    input.value = address;

    if (activeField === 'start') {
      startCoords = [lat, lng];
    } else {
      endCoords = [lat, lng];
    }
  } catch (err) {
    alert("Reverse geocoding failed.");
    console.error(err);
  }

  selectingFromMap = false;
});

document.getElementById('routeBtn').addEventListener('click', async () => {
  clearRoutes();

  if (!startCoords) {
    const input = document.querySelector('#start-geocoder input');
    if (input && input.value.trim()) {
      try {
        startCoords = await geocode(input.value.trim());
      } catch {
        alert("Start location not found.");
        return;
      }
    } else {
      alert("Please enter a start location.");
      return;
    }
  }

  if (!endCoords) {
    const input = document.querySelector('#end-geocoder input');
    if (input && input.value.trim()) {
      try {
        endCoords = await geocode(input.value.trim());
      } catch {
        alert("End location not found.");
        return;
      }
    } else {
      alert("Please enter an end location.");
      return;
    }
  }

  try {
    const walkData = await getRoute(startCoords, endCoords, "foot-walking");
    const bikeData = await getRoute(startCoords, endCoords, "cycling-regular");

    if (!walkData.features?.length || !bikeData.features?.length) {
      throw new Error("No route found.");
    }

    drawRoute(walkData.features[0].geometry, 'lime');
    drawRoute(bikeData.features[0].geometry, 'cyan');

    const allCoords = [
      ...walkData.features[0].geometry.coordinates,
      ...bikeData.features[0].geometry.coordinates
    ].map(c => [c[1], c[0]]);

    map.fitBounds(L.latLngBounds(allCoords).pad(0.1));
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
});

