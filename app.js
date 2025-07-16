
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
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return data;
}

function clearRoutes() {
  routeLayers.forEach(layer => map.removeLayer(layer));
  routeLayers = [];
}

function drawRoute(geojson, color) {
  const layer = L.geoJSON(geojson, {
    style: {color: color, weight: 5, opacity: 0.7}
  }).addTo(map);
  routeLayers.push(layer);
}

document.getElementById('routeBtn').addEventListener('click', async () => {
  clearRoutes();
  const startAddr = document.getElementById('start').value;
  const endAddr = document.getElementById('end').value;

  if (!startAddr || !endAddr) {
    alert("Please enter both start and destination.");
    return;
  }

  try {
    const startCoords = await geocode(startAddr);
    const endCoords = await geocode(endAddr);

    // Fetch routes for walking, biking, and transit
    const walkData = await getRoute(startCoords, endCoords, "foot-walking");
    const bikeData = await getRoute(startCoords, endCoords, "cycling-regular");
    // Transit profile is NOT available on ORS, so we will skip transit for now.

    // Draw routes with different colors
    drawRoute(walkData.features[0].geometry, 'lime');
    drawRoute(bikeData.features[0].geometry, 'cyan');

    // Fit map bounds to all routes
    const allCoords = [
      ...walkData.features[0].geometry.coordinates,
      ...bikeData.features[0].geometry.coordinates
    ].map(c => [c[1], c[0]]); // convert lon,lat to lat,lon

    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds.pad(0.1));

    // TODO: Add logic to choose and display the best option based on duration/distance
  } catch (err) {
    alert("Error: " + err.message);
  }
});
