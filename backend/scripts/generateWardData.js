import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateGridWards = (city, bounds, rows, cols, names) => {
  const { minLng, maxLng, minLat, maxLat } = bounds;
  const lngStep = (maxLng - minLng) / cols;
  const latStep = (maxLat - minLat) / rows;
  const features = [];
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const west = minLng + c * lngStep;
      const east = minLng + (c + 1) * lngStep;
      const south = minLat + r * latStep;
      const north = minLat + (r + 1) * latStep;

      const wardName = idx < names.length ? names[idx] : `Area ${idx + 1}`;

      const ring = [
        [west, south], [east, south], [east, north], [west, north], [west, south],
      ];

      features.push({
        type: "Feature",
        properties: {
          ward_no: idx + 1,
          ward_name: wardName,
        },
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      });
      idx++;
    }
  }

  return {
    type: "FeatureCollection",
    name: city.toLowerCase(),
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features,
  };
};

// Rename the grid cell that contains a known point so a specific locality
// (e.g. Jagdishpur) is guaranteed to produce a correctly named ward.
const pointInFeature = (lng, lat, feature) => {
  const ring = feature.geometry.coordinates[0];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return (
    lng >= Math.min(...xs) &&
    lng <= Math.max(...xs) &&
    lat >= Math.min(...ys) &&
    lat <= Math.max(...ys)
  );
};

const applyNamedPoints = (geojson, points) => {
  for (const point of points) {
    const feature = geojson.features.find((f) =>
      pointInFeature(point.lng, point.lat, f)
    );
    if (feature) {
      feature.properties.ward_name = point.name;
    } else {
      console.warn(`No grid cell found for ${point.name} (${point.lat}, ${point.lng}) — expand the city bounds.`);
    }
  }
  return geojson;
};

const prayagrajNames = [
  "Civil Lines", "Teliyarganj", "Old Cantt", "Govindpur", "Ashok Nagar",
  "Mumfordganj", "George Town", "Chowk", "Daraganj", "Jhunsi",
  "Naini", "Attarsuiya", "Rajapur", "Kydganj", "Tagore Town",
  "Dhoomanganj", "Lukerganj", "Muthiganj", "Katra", "Allapur",
  "Kareli", "Bairahana", "Soraon", "Phaphamau", "Karchana",
  "Shahganj", "Rambagh", "New Cantt", "Jhalwa", "Dhanpur",
  "Mau Aima", "Shivkuti", "Pipalganj", "Chatham Lines", "Bharatganj",
  "Pura Mufti", "Salori", "Katra Kotwali", "Baluaghat", "Purai",
  "Havelia", "Sarai Inayat", "Dandi", "Deohat", "Garwa",
  "Gauhaniya", "Ghorahwa", "Harirampur", "Iradatganj", "Jariyari",
  "Jhusi Khas", "Kadipur", "Kailashpuri", "Khuldabad", "Koeripur",
  "Kolhuwa", "Korari", "Kotwa", "Kumhwa", "Lalapur",
  "Mauhari", "Mavi", "Mawaiya", "Mirpur", "Mishirpur",
  "Muradpur", "Nagwa", "Nathupur", "Nehariya", "Newada",
  "Pandari", "Parsara", "Paschim Patti", "Pataitha", "Patti",
  "Pipri", "Pureni", "Rampur", "Sahari", "Sarai Mamrez",
];

const gorakhpurNames = [
  "Golghar", "Mohaddiganj", "Hata", "Shahpur", "Basharatpur",
  "Kasya", "Campierganj", "Buxipur", "Railway Colony", "Rapti Nagar",
  "Ramgarh Tal", "Beltar", "Chargawan", "Piprauli", "Sindhi Bazar",
  "Nakhas", "Bhainsa", "Gulariya", "Kauriram", "Sahjanwa",
  "Butari", "Chimghat", "Dharmshala", "Gheempur", "Jhungiya",
  "Khadar", "Khajani", "Khari", "Khorabar", "Mahatwa",
  "Majhauli", "Mangalpur", "Manikpur", "Mohanpur", "Mote Nagar",
  "Muktidham", "Nathmalpur", "Nausar", "Padrauna", "Pakka Bagh",
  "Pali", "Paraspur", "Parsa", "Patauna", "Patkhapura",
  "Peppiganj", "Phulwariya", "Pipara", "Pipiganj", "Prem Nagar",
  "Qadirganj", "Raja Bazar", "Ramwapur", "Raniganj", "Rasoolpur",
  "Ratanpur", "Salempur", "Sardar Nagar", "Semra", "Shahbazganj",
  "Shiv Nagar", "Shyam Nagar", "Siddiqpur", "Sikta", "Siswa",
  "Sonbarsa", "Sujanpur", "Takia", "Tamkuhi", "Uttar Tola",
];

const prayagrajBounds = { minLng: 81.78, maxLng: 81.93, minLat: 25.38, maxLat: 25.55 };
// Extended east to include the Jagdishpur locality (Chauri Chaura, 83.5415, 26.7435).
const gorakhpurBounds = { minLng: 83.28, maxLng: 83.62, minLat: 26.64, maxLat: 26.94 };

const prayagraj = generateGridWards("Prayagraj", prayagrajBounds, 8, 10, prayagrajNames);
const gorakhpur = generateGridWards("Gorakhpur", gorakhpurBounds, 7, 10, gorakhpurNames);

// Ensure the Jagdishpur locality resolves to a ward named "Jagdishpur".
applyNamedPoints(gorakhpur, [
  { name: "Jagdishpur", lng: 83.5415, lat: 26.7435 },
]);

const dataDir = path.resolve(__dirname, "../data");
fs.writeFileSync(`${dataDir}/prayagraj.geojson`, JSON.stringify(prayagraj, null, 2));
fs.writeFileSync(`${dataDir}/gorakhpur.geojson`, JSON.stringify(gorakhpur, null, 2));

console.log(`Generated ${prayagraj.features.length} Prayagraj wards`);
console.log(`Generated ${gorakhpur.features.length} Gorakhpur wards`);
console.log("Files saved to backend/data/");