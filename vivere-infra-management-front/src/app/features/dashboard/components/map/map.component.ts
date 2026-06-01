import { Component, AfterViewInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

const iconDefault = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize:    [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  info?: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div id="main-map" style="height: 100%; min-height: 250px; border-radius: 8px;"></div>`,
})
export class MapComponent implements AfterViewInit, OnChanges {
  @Input() viewOnly: boolean = false;
  @Input() markers: MapMarker[] = [];
  @Output() locationSelected = new EventEmitter<{lat: number, lng: number}>();

  private map!: L.Map;
  private markersLayer = L.layerGroup();

  ngAfterViewInit(): void {
    this.map = L.map('main-map').setView([-22.9068, -43.1729], 10); // Default: Rio de Janeiro
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.markersLayer.addTo(this.map);

    if (!this.viewOnly) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.map.eachLayer((layer) => {
          if (layer instanceof L.Marker && !this.viewOnly) this.map.removeLayer(layer);
        });
        L.marker([lat, lng]).addTo(this.map);
        this.locationSelected.emit({ lat, lng });
      });
    }

    this.renderMarkers();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['markers'] && this.map) {
      this.renderMarkers();
    }
  }

  private renderMarkers() {
    this.markersLayer.clearLayers();

    this.markers.forEach(m => {
      if (m.lat && m.lng) {
        const marker = L.marker([m.lat, m.lng]);

        // Popup (abre ao clicar no pin) com informações do evento
        const popupContent = `
          <div style="
            font-family: 'Inter', sans-serif;
            min-width: 180px;
            max-width: 240px;
            padding: 4px 2px;
          ">
            <strong style="
              color: #ff6600;
              font-size: 13px;
              display: block;
              margin-bottom: 6px;
              line-height: 1.3;
            ">${m.title}</strong>
            ${m.info
              ? `<div style="color: #444; font-size: 12px; line-height: 1.6;">${m.info}</div>`
              : ''}
          </div>
        `;
        marker.bindPopup(popupContent, {
          maxWidth: 260,
          closeButton: true,
          className: 'vivere-popup'
        });

        // Tooltip discreto ao passar o mouse (apenas o nome)
        marker.bindTooltip(m.title, {
          direction: 'top',
          offset: [0, -38],
          opacity: 0.9,
          className: 'vivere-tooltip'
        });

        this.markersLayer.addLayer(marker);
      }
    });

    // Ajusta o zoom para mostrar todos os pins quando em modo visualização
    if (this.viewOnly && this.markers.length > 0) {
      const layers = this.markersLayer.getLayers() as L.Layer[];
      if (layers.length === 1) {
        // Um único pin: centra e aplica zoom médio
        const single = layers[0] as L.Marker;
        this.map.setView(single.getLatLng(), 13);
      } else if (layers.length > 1) {
        const group = new L.FeatureGroup(layers);
        this.map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 13 });
      }
    }
  }
}