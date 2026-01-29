/**
 * RouteSimulator - Physics-based vehicle routing and simulation engine
 * 
 * Simulates realistic vehicle movement along routes with:
 * - Smooth acceleration/deceleration
 * - Corner detection and intersection stops
 * - Speed limit compliance
 * - ETA calculation
 */

class RouteSimulator {
  constructor(waypoints, speedLimits, routeData = {}) {
    this.waypoints = waypoints || [];
    this.speedLimits = speedLimits || [];
    this.routeData = routeData;

    // Simulation state
    this.currentWaypointIdx = 0;
    this.progressAlongSegment = 0.0;
    this.currentSpeedMph = 0.0;
    this.targetSpeedMph = 0.0;

    // Physics constants (ft/s²)
    this.comfortAccel = 8.0;   // ~2.4 m/s² - comfortable acceleration
    this.comfortDecel = 10.0;  // ~3 m/s² - comfortable braking
    this.postStopAccel = 5.0;  // gentler acceleration after a stop

    // Distance tracking
    this.totalDistanceMiles = routeData.totalDistanceMeters 
      ? routeData.totalDistanceMeters * 0.000621371 
      : 0;
    this.distanceTraveledMiles = 0.0;

    // Stop/dwell state
    this.atStop = false;
    this.stopStartTime = 0;
    this.stopDuration = 0;
    this.stoppedCorners = new Set(); // corners we've already stopped at

    // Post-stop gentle acceleration
    this.isAcceleratingFromStop = false;
    this.accelFromStopTime = 0;

    // Speed averaging for stable ETA
    this.avgSpeedMph = 25.0;
    this.lastMovingSpeedMph = 25.0;

    // Detect corners (intersections)
    this.detectedCorners = this._detectCorners();
  }

  /**
   * Detect corners by analyzing angle changes between segments.
   * Returns Set of waypoint indices where sharp turns (>30°) occur.
   */
  _detectCorners() {
    const corners = new Set();
    if (this.waypoints.length < 3) return corners;

    for (let i = 1; i < this.waypoints.length - 1; i++) {
      const prev = this.waypoints[i - 1];
      const curr = this.waypoints[i];
      const next = this.waypoints[i + 1];

      const vec1 = { lat: curr[0] - prev[0], lon: curr[1] - prev[1] };
      const vec2 = { lat: next[0] - curr[0], lon: next[1] - curr[1] };

      const mag1 = Math.sqrt(vec1.lat ** 2 + vec1.lon ** 2);
      const mag2 = Math.sqrt(vec2.lat ** 2 + vec2.lon ** 2);

      if (mag1 > 0 && mag2 > 0) {
        const dot = (vec1.lat * vec2.lat + vec1.lon * vec2.lon) / (mag1 * mag2);
        const dotClamped = Math.max(-1, Math.min(1, dot));
        const angleDeg = (Math.acos(dotClamped) * 180) / Math.PI;

        if (angleDeg > 30) {
          corners.add(i);
        }
      }
    }
    return corners;
  }

  /**
   * Haversine distance in feet between two lat/lon points.
   */
  _haversineDistanceFt(lat1, lon1, lat2, lon2) {
    const R = 20902231; // Earth radius in feet
    const toRad = Math.PI / 180;

    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get distance of current segment in feet
   */
  getCurrentSegmentDistanceFt() {
    if (this.currentWaypointIdx >= this.waypoints.length - 1) return 0;

    const start = this.waypoints[this.currentWaypointIdx];
    const end = this.waypoints[this.currentWaypointIdx + 1];

    return this._haversineDistanceFt(start[0], start[1], end[0], end[1]);
  }

  /**
   * Get remaining distance to next waypoint in feet
   */
  _getDistanceToNextWaypointFt() {
    const segmentDist = this.getCurrentSegmentDistanceFt();
    if (segmentDist <= 0) return 0;
    return Math.max(0, segmentDist * (1.0 - this.progressAlongSegment));
  }

  /**
   * Interpolate position along current segment
   */
  getCurrentPosition() {
    if (this.currentWaypointIdx >= this.waypoints.length - 1) {
      return this.waypoints[this.waypoints.length - 1];
    }

    const start = this.waypoints[this.currentWaypointIdx];
    const end = this.waypoints[this.currentWaypointIdx + 1];
    const t = this.progressAlongSegment;

    return [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t
    ];
  }

  /**
   * Get overall route progress (0-100%)
   */
  getProgressPercent() {
    if (this.totalDistanceMiles === 0) return 100;
    return Math.min(
      100,
      (this.distanceTraveledMiles / this.totalDistanceMiles) * 100
    );
  }

  /**
   * Get remaining distance in miles
   */
  getDistanceRemaining() {
    return Math.max(0, this.totalDistanceMiles - this.distanceTraveledMiles);
  }

  /**
   * Get ETA in seconds (stable, avoids huge values during stops)
   */
  getEtaSeconds() {
    const remainingMiles = this.getDistanceRemaining();
    const avgSpeed = Math.max(5.0, this.avgSpeedMph, this.lastMovingSpeedMph);
    return (remainingMiles / avgSpeed) * 3600;
  }

  /**
   * Calculate target speed based on speed limits and upcoming corners.
   */
  calculateTargetSpeed() {
    // If currently stopped, stay stopped until dwell time elapses
    if (this.atStop) {
      const elapsed = (Date.now() - this.stopStartTime) / 1000;
      if (elapsed < this.stopDuration) {
        return 0;
      }
      // Dwell complete - resume driving
      this.atStop = false;
      this.isAcceleratingFromStop = true;
      this.accelFromStopTime = 0;
      
      // Advance past the corner waypoint
      if (this.progressAlongSegment >= 0.99 && this.currentWaypointIdx < this.waypoints.length - 2) {
        this.currentWaypointIdx++;
        this.progressAlongSegment = 0;
      }
    }

    // Get base speed limit for current segment
    const baseSpeedLimit = this.speedLimits[this.currentWaypointIdx] || 30;

    // Check if approaching a corner we haven't stopped at yet
    const nextWaypointIdx = this.currentWaypointIdx + 1;
    const isCornerAhead = this.detectedCorners.has(nextWaypointIdx) && 
                          !this.stoppedCorners.has(nextWaypointIdx);

    if (isCornerAhead) {
      const distToCornerFt = this._getDistanceToNextWaypointFt();
      const currentSpeedFps = this.currentSpeedMph * 1.46667;
      
      // Calculate stopping distance needed
      const stoppingDistFt = (currentSpeedFps ** 2) / (2 * this.comfortDecel);
      const bufferFt = 15;

      // If we need to start braking
      if (distToCornerFt <= stoppingDistFt + bufferFt + 50) {
        // Calculate speed to maintain smooth decel to stop
        const remainingFt = Math.max(0, distToCornerFt - bufferFt);
        const targetSpeedFps = Math.sqrt(Math.max(0, 2 * this.comfortDecel * remainingFt));
        const targetSpeedMph = targetSpeedFps / 1.46667;

        // If very close, trigger the stop
        if (distToCornerFt <= bufferFt) {
          this.atStop = true;
          this.stopStartTime = Date.now();
          this.stopDuration = 3 + Math.random() * 7; // 3-10 seconds
          this.stoppedCorners.add(nextWaypointIdx);
          this.progressAlongSegment = 1.0; // snap to corner
          return 0;
        }

        return Math.max(0, Math.min(targetSpeedMph, baseSpeedLimit));
      }
    }

    return baseSpeedLimit;
  }

  /**
   * Update speed with physics-based acceleration/deceleration.
   */
  updateSpeed(deltaTime) {
    this.targetSpeedMph = this.calculateTargetSpeed();

    // Handle post-stop gentle acceleration period
    if (this.isAcceleratingFromStop) {
      this.accelFromStopTime += deltaTime;
      if (this.accelFromStopTime > 5) {
        this.isAcceleratingFromStop = false;
      }
    }

    const currentSpeedFps = this.currentSpeedMph * 1.46667;
    const targetSpeedFps = this.targetSpeedMph * 1.46667;
    const speedDiffFps = targetSpeedFps - currentSpeedFps;

    // If close enough, just set it
    if (Math.abs(speedDiffFps) < 0.5) {
      this.currentSpeedMph = this.targetSpeedMph;
    } else {
      // Choose acceleration rate
      let accel;
      if (speedDiffFps > 0) {
        accel = this.isAcceleratingFromStop ? this.postStopAccel : this.comfortAccel;
      } else {
        accel = -this.comfortDecel;
      }

      const maxChangeFps = accel * deltaTime;
      let newSpeedFps;

      if (Math.abs(speedDiffFps) <= Math.abs(maxChangeFps)) {
        newSpeedFps = targetSpeedFps;
      } else {
        newSpeedFps = currentSpeedFps + maxChangeFps;
      }

      this.currentSpeedMph = Math.max(0, newSpeedFps / 1.46667);
    }

    // Update averages for ETA
    if (this.currentSpeedMph > 1) {
      this.lastMovingSpeedMph = this.currentSpeedMph;
    }
    this.avgSpeedMph = this.avgSpeedMph * 0.95 + this.currentSpeedMph * 0.05;
  }

  /**
   * Update position along the route.
   */
  updatePosition(deltaTime) {
    if (this.currentSpeedMph < 0.1) return;

    const distanceFt = this.currentSpeedMph * 1.46667 * deltaTime;
    const distanceMiles = distanceFt / 5280;
    this.distanceTraveledMiles += distanceMiles;

    const segmentDistFt = this.getCurrentSegmentDistanceFt();
    if (segmentDistFt <= 0) return;

    const progressDelta = distanceFt / segmentDistFt;
    this.progressAlongSegment += progressDelta;

    // Advance through waypoints
    while (this.progressAlongSegment >= 1.0 && this.currentWaypointIdx < this.waypoints.length - 2) {
      // Check if next waypoint is a corner we need to stop at
      const nextIdx = this.currentWaypointIdx + 1;
      if (this.detectedCorners.has(nextIdx) && !this.stoppedCorners.has(nextIdx)) {
        // Stop at this corner
        this.progressAlongSegment = 1.0;
        this.atStop = true;
        this.stopStartTime = Date.now();
        this.stopDuration = 3 + Math.random() * 7;
        this.stoppedCorners.add(nextIdx);
        this.currentSpeedMph = 0;
        return;
      }

      this.progressAlongSegment -= 1.0;
      this.currentWaypointIdx++;
    }

    // Clamp at end
    if (this.currentWaypointIdx >= this.waypoints.length - 2) {
      this.progressAlongSegment = Math.min(1.0, this.progressAlongSegment);
    }
  }

  /**
   * Main update loop - call every ~100ms with deltaTime in seconds.
   */
  update(deltaTime) {
    if (this.getProgressPercent() >= 100) {
      this.currentSpeedMph = 0;
      return;
    }

    this.updateSpeed(deltaTime);
    this.updatePosition(deltaTime);
  }

  /**
   * Get current simulation state.
   */
  getStatus() {
    return {
      position: this.getCurrentPosition(),
      progressPct: this.getProgressPercent(),
      currentSpeed: this.currentSpeedMph,
      distanceRemaining: this.getDistanceRemaining(),
      etaSeconds: this.getEtaSeconds(),
      atStop: this.atStop,
      stopDuration: this.stopDuration,
      stopElapsedTime: this.atStop ? (Date.now() - this.stopStartTime) / 1000 : 0
    };
  }
}

// Export for browsers and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RouteSimulator;
}