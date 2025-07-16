// Initialize map without zoom or attribution controls for minimalism
const map = L.map('map', {
  zoomControl: false,
  attributionControl: true  // Keep attribution but style it later
}).setView([42.2808, -83.7430], 13);

// Add Carto Dark tile layer (ultra clean, dark gray)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
  detectRetina: true  // sharper on retina displays
}).addTo(map);
