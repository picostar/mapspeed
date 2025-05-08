

# Dynamic Speed Map

A web-based mapping tool that visualizes speed limits on roads using OpenStreetMap data. This project is designed to display both maximum speed limits and inferred speeds for roads within a given area, with support for toggling between the two.

## Features

- **Interactive Map with Leaflet.js**  
  Displays roads and overlays speed limit data dynamically.

- **Dynamic Speed Limits**  
  Visualizes both maximum speed limits and inferred speed limits for roads.

- **ZIP Code Search**  
  Allows users to search for locations by entering a ZIP code.

- **Real-time Updates**  
  Automatically fetches and displays road data when the map is moved or zoomed.

- **Legend & UI Controls**  
  - Toggle the display of maximum speed (red) and inferred speed (yellow).
  - Input ZIP codes to quickly navigate to specific areas.

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
2. Open the `index.html` file in your browser.

### Usage

1. **Explore the Map**  
   Navigate around the map to view roads and their speed limits. Roads with maximum speed limits are marked in **red**, and roads with inferred speeds are marked in **yellow**.

2. **Search by ZIP Code**  
   - Enter a ZIP code in the top-right input box and click "Go" to jump to that area.
   - The map will fetch and display road data for the selected ZIP code.

3. **Toggle Speed Display**  
   Use the checkboxes in the legend (bottom-right) to toggle between displaying maximum speed and inferred speed overlays.

### How It Works

- **Data Source**:  
  The map fetches road data from [OpenStreetMap's Overpass API](https://overpass-api.de/).

- **Speed Inference**:  
  If a road does not have a defined `maxspeed` tag, the application infers speed limits based on road types using the following defaults:
  - **Primary**: 55 mph
  - **Secondary**: 45 mph
  - **Tertiary**: 35 mph
  - **Residential**: 25 mph
  - **Unclassified**: 30 mph
  - **Service**: 15 mph

- **Dynamic Updates**:  
  The map fetches new data whenever the visible map area changes (e.g., zoom or drag).

### Technologies Used

- **[Leaflet.js](https://leafletjs.com/)**: Interactive map rendering.
- **[OpenStreetMap](https://www.openstreetmap.org/)**: Road and location data.
- **HTML, CSS, JavaScript**: Core technologies for building the app.

### Folder Structure

```plaintext
mapspeed/
├── index.html  # Main application file
└── README.md   # Project documentation
```

### Limitations

- The accuracy of speed limits depends on the data available in OpenStreetMap.
- Currently, only supports locations in the United States.

### Contributions

Contributions are welcome! If you find a bug or have an idea for a new feature, feel free to submit an issue or create a pull request.

### License

This project is licensed under the [MIT License](LICENSE).

### Acknowledgments

- **[OpenStreetMap](https://www.openstreetmap.org/)** for providing the road data.
- **[Leaflet.js](https://leafletjs.com/)** for the awesome mapping library.

---

Let me know if you’d like me to include any additional sections or make modifications!
