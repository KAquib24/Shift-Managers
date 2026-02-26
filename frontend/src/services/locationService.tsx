// frontend/src/services/locationService.ts
import { Geolocation } from '@capacitor/geolocation';
// Remove unused import: import { BackgroundTask } from '@capacitor/background-task';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy: number;
}

class LocationService {
  private watchId: string | null = null;
  private locations: LocationPoint[] = [];
  private isTracking = false;

  async startTracking() {
    if (this.isTracking) return;
    
    try {
      // Request permission
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      // Start watching position
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        },
        (position, error) => {
          if (error) {
            console.error('Location error:', error);
            return;
          }
          
          if (position) {
            this.locations.push({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date(position.timestamp),
              accuracy: position.coords.accuracy
            });
            
            // Keep only last 100 points
            if (this.locations.length > 100) {
              this.locations.shift();
            }
            
            // Check if near workplace
            this.checkGeofence(position.coords);
          }
        }
      );
      
      this.isTracking = true;
      console.log('📍 Location tracking started');
      
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  }

  stopTracking() {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
      this.isTracking = false;
      console.log('📍 Location tracking stopped');
    }
  }

  private checkGeofence(coords: any) {
    // Define workplace location (should come from API)
    const workplace = {
      lat: 28.6139,
      lng: 77.2090,
      radius: 100 // meters
    };
    
    // Calculate distance (simplified)
    const distance = this.calculateDistance(
      coords.latitude,
      coords.longitude,
      workplace.lat,
      workplace.lng
    );
    
    if (distance <= workplace.radius) {
      // Trigger auto clock in if within range
      this.triggerAutoClockIn();
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private async triggerAutoClockIn() {
    // Check if already clocked in
    // If not, auto clock in
    console.log('📍 Near workplace - triggering auto clock in');
    
    // This would call your API
    // await API.post('/shifts/clock/auto', { method: 'geofence' });
  }

  getLocationHistory(): LocationPoint[] {
    return [...this.locations];
  }

  getLastLocation(): LocationPoint | null {
    return this.locations.length > 0 ? this.locations[this.locations.length - 1] : null;
  }
}

export default new LocationService();