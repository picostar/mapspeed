# Mapspeed + Route Simulator

A web-based mapping tool that visualizes speed limits on roads using OpenStreetMap data, with an integrated route simulator for planning and visualizing vehicle travel.

## Features

- **Interactive Map with Leaflet.js**  
  Displays roads and overlays speed limit data dynamically.

- **Dynamic Speed Limits**  
  Visualizes both maximum speed limits and inferred speed limits for roads.
  - Solid lines: Confirmed speed limits from OpenStreetMap
  - Dashed lines: Inferred speeds based on road type

- **Route Simulator**  
  Plan routes by clicking start and end points on the map.
  - Physics-based vehicle simulation with realistic acceleration/deceleration
  - Speed limit compliance - vehicle follows road speed limits
  - Intersection stops with 3-10 second dwell times
  - Real-time display of speed, ETA, distance, and progress

- **Speed Limit Sign Display**  
  Shows the current road's speed limit as a visual sign

- **Hover Speed Tooltip**  
  Hover over any road to see its speed limit in a tooltip

- **Real-time Updates**  
  Automatically fetches and displays road data when the map is moved or zoomed. Already-visited areas are cached, so panning or zooming within loaded territory does not refetch.

## Demo

https://picostar.github.io/mapspeed/

## Getting Started

### Prerequisites

To run this project, you need a modern web browser with JavaScript enabled. The application is entirely client-side and does not require any backend setup.

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/picostar/mapspeed.git
   ```
2. Open `index.html` in your browser, or serve via a local HTTP server:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000/index.html`

### Usage

1. **Explore the Map**  
   Navigate around the map to view roads and their speed limits. Color coding indicates speed:
   - Red/Orange: Lower speeds (5-25 mph)
   - Yellow/Green: Medium speeds (30-50 mph)
   - Blue: Higher speeds (55-75 mph)

2. **Plan a Route**  
   - Click on the map to set a start location (green marker)
   - Click again to set an end location (red marker)
   - The route will be calculated and the simulation begins automatically

3. **Control the Simulation**  
   - **Pause/Resume**: Pause and resume the vehicle simulation
   - **Reset Route**: Clear the route and start over

4. **View Trip Info**  
   The bottom panel shows:
   - Distance remaining
   - Current vehicle speed
   - Estimated time of arrival (ETA)
   - Progress percentage
   - Dwell countdown when stopped at intersections

### How It Works

- **Data Sources**:  
  - Road data: [OpenStreetMap's Overpass API](https://overpass-api.de/)
  - Routing: [OSRM (Open Source Routing Machine)](https://router.project-osrm.org/)

- **Speed Inference**:  
  If a road does not have a defined `maxspeed` tag, the application infers speed limits based on road types:
  - **Motorway**: 65 mph
  - **Primary**: 55 mph
  - **Secondary**: 45 mph
  - **Tertiary**: 35 mph
  - **Residential**: 25 mph
  - **Service**: 15 mph

- **Speed Data Loading**:  
  Road speed data comes from the Overpass API, fetched for the visible map area plus a 20% margin. Each loaded area is cached for the session; moving the map only triggers a new fetch when the view leaves covered territory. Only vehicular road types are requested (footpaths, cycleways, and trails carry no speed limits). Requests time out after 15 seconds and fall back to a second Overpass server.

- **Route Speed Limits**:  
  The simulator resolves speed limits by OSM way identity. OSRM returns the node IDs of the ways the route follows, and each route segment takes its speed from the matching way. This keeps speeds correct at overpasses and underpasses, where a nearest-road lookup would grab the road on the other level.

- **Simulation Physics**:  
  - Comfort acceleration: 8 ft/s² (~2.4 m/s²)
  - Comfort deceleration: 10 ft/s² (~3 m/s²)
  - Post-stop gentle acceleration: 5 ft/s²
  - Corner detection: >30° turn angle triggers intersection stop

### Technologies Used

- **[Leaflet.js](https://leafletjs.com/)**: Interactive map rendering
- **[OpenStreetMap](https://www.openstreetmap.org/)**: Road and location data
- **[OSRM](https://router.project-osrm.org/)**: Route calculation
- **HTML, CSS, JavaScript**: Core technologies

### Folder Structure

```plaintext
mapspeed/
├── index.html           # Main application (map + route simulator)
├── route-simulator.js   # Physics-based route simulation engine
└── README.md            # Project documentation
```

### Limitations

- **Speed loading can be slow or fail when Overpass servers are busy.** The public Overpass servers are shared infrastructure and intermittently return errors (HTTP 504) or respond slowly under load. The app times out each request after 15 seconds and tries a second server, so the worst case is about 30 seconds before an error message appears with the failure reason. This is server-side load; the Reload button retries the current view and usually works a moment later.
- The accuracy of speed limits depends on data available in OpenStreetMap. Roads without a `maxspeed` tag get an inferred speed based on road type (shown dashed).
- Route calculation uses the OSRM public server, which may rate-limit and runs on a slightly older OSM snapshot; route segments that cannot be matched to loaded road data fall back to the last known speed (or 30 mph).
- Cached road data lasts for the browser session; a refresh clears it.

### Contributions

Contributions are welcome! If you find a bug or have an idea for a new feature, feel free to submit an issue or create a pull request.

### License

This project is licensed under the [MIT License](LICENSE).

### Acknowledgments

- **[OpenStreetMap](https://www.openstreetmap.org/)** for providing the road data.
- **[Leaflet.js](https://leafletjs.com/)** for the awesome mapping library.
