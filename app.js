// Initialize the Leaflet map
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
    style: {color: color, weight: 5, opacity: 0.7}
  }).addTo(map);
  routeLayers.push(layer);
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

// MAPBOX Geocoder setup
mapboxgl.accessToken = 'pk.eyJ1IjoibWVpcnJ5IiwiYSI6ImNtZDVqNW5yYjAwNWUyaXBxNnVxdnNwbWwifQ.7JH45nsFVDMECiBdhatvVw';

const startGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Start location",
  mapboxgl: mapboxgl
});
const endGeocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Destination",
  mapboxgl: mapboxgl
});

document.getElementById('start-geocoder').appendChild(startGeocoder.onAdd(map));
document.getElementById('end-geocoder').appendChild(endGeocoder.onAdd(map));

let startCoords = null;
let endCoords = null;

startGeocoder.on('result', e => {
  startCoords = [e.result.center[1], e.result.center[0]];
});
endGeocoder.on('result', e => {
  endCoords = [e.result.center[1], e.result.center[0]];
});

document.getElementById('routeBtn').addEventListener('click', async () => {
  clearRoutes();

  if (!startCoords || !endCoords) {
    alert("Please select both start and end locations.");
    return;
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
