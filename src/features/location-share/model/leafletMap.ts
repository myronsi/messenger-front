import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getApiBaseUrl } from '@/shared/api/config';
import { acquireMedia } from '@/shared/api/mediaCache';

export interface PickerPoint {
  lat: number;
  lon: number;
}

export interface PickerMap {
  moveTo: (point: PickerPoint, zoom?: number, accuracy?: number | null) => void;
  resize: () => void;
  destroy: () => void;
}

const PIN = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="hsl(var(--background))" '
  + 'stroke-width="1.5"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="hsl(var(--background))"/></svg>';

export const tileTemplate = () => `${String(getApiBaseUrl()).replace(/\/$/, '')}/maps/tiles/{z}/{x}/{y}`;

class AuthenticatedTiles extends L.TileLayer {
  private leases = new Map<HTMLElement, () => void>();

  createTile(coords: L.Coords, done: L.DoneCallback) {
    const tile = document.createElement('img');
    tile.alt = '';
    tile.setAttribute('role', 'presentation');
    const lease = acquireMedia(this.getTileUrl(coords));
    this.leases.set(tile, lease.release);
    tile.onload = () => done(undefined, tile);
    tile.onerror = () => done(new Error('tile failed'), tile);
    lease.promise.then((objectUrl) => { tile.src = objectUrl; }, (error: Error) => done(error, tile));
    return tile;
  }

  releaseTile(tile: HTMLElement) {
    this.leases.get(tile)?.();
    this.leases.delete(tile);
  }

  releaseAll() {
    this.leases.forEach((release) => release());
    this.leases.clear();
  }
}

export const createPickerMap = (container: HTMLElement, start: PickerPoint, startZoom: number, onPick: (point: PickerPoint) => void): PickerMap => {
  const map = L.map(container, { attributionControl: false, zoomControl: true, worldCopyJump: true }).setView([start.lat, start.lon], startZoom);
  const tiles = new AuthenticatedTiles(tileTemplate(), { maxZoom: 19, minZoom: 2, tileSize: 256, crossOrigin: false });
  tiles.on('tileunload', (event: L.TileEvent) => tiles.releaseTile(event.tile));
  tiles.addTo(map);
  const icon = L.divIcon({ html: PIN, className: 'text-primary', iconSize: [36, 36], iconAnchor: [18, 34] });
  const marker = L.marker([start.lat, start.lon], { draggable: true, icon, keyboard: true, autoPan: true }).addTo(map);
  let circle: L.Circle | null = null;
  const pick = (latLng: L.LatLng) => {
    circle?.remove();
    circle = null;
    const wrapped = latLng.wrap();
    onPick({ lat: wrapped.lat, lon: wrapped.lng });
  };
  marker.on('dragend', () => pick(marker.getLatLng()));
  map.on('click', (event: L.LeafletMouseEvent) => {
    marker.setLatLng(event.latlng);
    pick(event.latlng);
  });
  return {
    moveTo: (point, zoom, accuracy) => {
      marker.setLatLng([point.lat, point.lon]);
      map.setView([point.lat, point.lon], zoom ?? map.getZoom());
      circle?.remove();
      circle = accuracy ? L.circle([point.lat, point.lon], { radius: accuracy, weight: 1, color: 'hsl(var(--primary))', fillOpacity: 0.12 }).addTo(map) : null;
    },
    resize: () => map.invalidateSize(),
    destroy: () => {
      tiles.releaseAll();
      map.remove();
    },
  };
};
