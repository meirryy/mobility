
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
