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

// Geocode function (fallback for typed input)
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.length === 0) throw new Error("Location not found");
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

async function getRoute(start, end, profile) {
  const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdiZWE3MzVmOTFmZjRmMjlhYTRhZDgxMGZiYTQyYjcwIiwiaCI6Im11cm11cjY0In0="; // Replace with your real OpenRouteService API key
  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  const body = {
    coordinates: [
      [start[1], start[0]],  // [lon, lat]
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
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}


// Mapbox GL & Geocoder setup
mapboxgl.accessToken = 'pk.eyJ1IjoibWVpcnJ5IiwiYSI6ImNtZDVqNW5yYjAwNWUyaXBxNnVxdnNwbWwifQ.7JH45nsFVDMECiBdhatvVw';

const startGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Start location",
  mapboxgl: mapboxgl,
  marker: false,
});
const endGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Destination",
  mapboxgl: mapboxgl,
  marker: false,
});

document.getElementById('start-geocoder').appendChild(startGeocoder.onAdd(map));
document.getElementById('end-geocoder').appendChild(endGeocoder.onAdd(map));

let startCoords = null;
let endCoords = null;

// Update coords on selection
startGeocoder.on('result', e => {
  startCoords = [e.result.center[1], e.result.center[0]];
  console.log('Start coords selected:', startCoords);
});
endGeocoder.on('result', e => {
  endCoords = [e.result.center[1], e.result.center[0]];
  console.log('End coords selected:', endCoords);
});

// Reset coords if inputs cleared
startGeocoder.on('clear', () => {
  startCoords = null;
  console.log('Start coords cleared');
});
endGeocoder.on('clear', () => {
  endCoords = null;
  console.log('End coords cleared');
});

document.getElementById('routeBtn').addEventListener('click', async () => {
  clearRoutes();

  // Fallback geocode typed input if no coords selected
  if (!startCoords) {
    const startInput = document.querySelector('#start-geocoder input');
    if (startInput && startInput.value.trim() !== '') {
      try {
        startCoords = await geocode(startInput.value.trim());
        console.log('Fallback geocoded startCoords:', startCoords);
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
    const endInput = document.querySelector('#end-geocoder input');
    if (endInput && endInput.value.trim() !== '') {
      try {
        endCoords = await geocode(endInput.value.trim());
        console.log('Fallback geocoded endCoords:', endCoords);
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

    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds.pad(0.1));
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
});

let selectingFromMap = false;
let activeInputField = 'start';
let clickMarker;

// Append "select on map" option reliably
function addMapSelectOptionToInput(inputEl, field) {
  inputEl.addEventListener('focus', () => {
    activeInputField = field;

    // Wait for suggestions to load
    setTimeout(() => {
      const container = inputEl.parentNode;
      const dropdown = container.querySelector('.suggestions');

      // Prevent duplicates
      if (dropdown && !dropdown.querySelector('.map-select-option')) {
        const option = document.createElement('div');
        option.className = 'map-select-option';
        option.textContent = '📍 Double click on map to select location';
        option.style.padding = '8px';
        option.style.cursor = 'pointer';
        option.style.background = '#1a1a1a';
        option.style.color = '#eee';

        option.addEventListener('click', () => {
          selectingFromMap = true;
          alert("Double click on the map to choose a location.");
        });

        dropdown.prepend(option);
      }
    }, 400);
  });
}

// Apply to both geocoder inputs
setTimeout(() => {
  const startInput = document.querySelector('#start-geocoder input');
  const endInput = document.querySelector('#end-geocoder input');
  if (startInput && endInput) {
    addMapSelectOptionToInput(startInput, 'start');
    addMapSelectOptionToInput(endInput, 'end');
  }
}, 1000);  // Wait until geocoder renders

map.on('dblclick', async (e) => {
  if (!selectingFromMap) return;

  const { lat, lng } = e.latlng;

  // Place or move pin
  if (clickMarker) map.removeLayer(clickMarker);
  clickMarker = L.marker([lat, lng]).addTo(map);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    if (activeInputField === 'start') {
      document.querySelector('#start-geocoder input').value = address;
      startCoords = [lat, lng];
    } else {
      document.querySelector('#end-geocoder input').value = address;
      endCoords = [lat, lng];
    }

    selectingFromMap = false;
  } catch (err) {
    alert("Reverse geocoding failed.");
    console.error(err);
  }
});

let selectingFromMap = false;
let activeInputField = null;
let clickMarker = null;

// Reference to dropdown
const dropdown = document.getElementById('map-select-dropdown');
const mapSelectOption = document.getElementById('map-select-option');

// Show dropdown on focus
function attachMapDropdown(inputEl, field) {
  inputEl.addEventListener('focus', (e) => {
    activeInputField = field;
    const rect = inputEl.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.classList.remove('hidden');
  });
}

// Hide dropdown on outside click
document.addEventListener('click', (e) => {
  if (!dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// Handle selection
mapSelectOption.addEventListener('click', () => {
  selectingFromMap = true;
  dropdown.classList.add('hidden');
  alert("Now double-click on the map to select a location.");
});

// Double-click map to select location
map.on('dblclick', async (e) => {
  if (!selectingFromMap || !activeInputField) return;

  const { lat, lng } = e.latlng;

  // Place marker
  if (clickMarker) map.removeLayer(clickMarker);
  clickMarker = L.marker([lat, lng]).addTo(map);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    const inputEl = document.querySelector(`#${activeInputField}-geocoder input`);
    inputEl.value = address;

    if (activeInputField === 'start') {
      startCoords = [lat, lng];
    } else {
      endCoords = [lat, lng];
    }

    selectingFromMap = false;
  } catch (err) {
    alert("Error getting address from map click.");
    console.error(err);
  }
});

// Attach dropdown behavior after geocoders load
setTimeout(() => {
  const startInput = document.querySelector('#start-geocoder input');
  const endInput = document.querySelector('#end-geocoder input');
  if (startInput && endInput) {
    attachMapDropdown(startInput, 'start');
    attachMapDropdown(endInput, 'end');
  }
}, 1000);
