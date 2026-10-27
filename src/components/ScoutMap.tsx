import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BusinessScanResult, CompetitorInfo } from "@contracts/grid";
import { CATEGORY_META } from "@contracts/grid";
import { scoreColor } from "@/lib/format";

/** Custom additive-blend canvas heat layer (no external dependency). */
class HeatLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private points: Array<[number, number, number]> = [];
  private radius: number;

  constructor(points: Array<[number, number, number]>, radius: number) {
    super();
    this.points = points;
    this.radius = radius;
  }

  onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create("canvas");
    const size = map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
    this.canvas.style.cssText =
      "position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;";
    map.getPanes().overlayPane.appendChild(this.canvas);
    map.on("move zoom moveend zoomend resize", this._redraw, this);
    this._redraw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off("move zoom moveend zoomend resize", this._redraw, this);
    if (this.canvas) {
      map.getPanes().overlayPane.removeChild(this.canvas);
      this.canvas = null;
    }
    return this;
  }

  private _redraw() {
    const map = this._map;
    const canvas = this.canvas;
    if (!map || !canvas) return;
    const size = map.getSize();
    if (canvas.width !== size.x) canvas.width = size.x;
    if (canvas.height !== size.y) canvas.height = size.y;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    for (const [lat, lng, intensity] of this.points) {
      const p = map.latLngToContainerPoint([lat, lng]);
      const r = this.radius * (0.7 + intensity * 0.6);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      const a = 0.10 + intensity * 0.22;
      g.addColorStop(0, `hsla(188, 86%, 53%, ${a})`);
      g.addColorStop(0.5, `hsla(43, 96%, 55%, ${a * 0.55})`);
      g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

interface Props {
  results: BusinessScanResult[];
  selectedId: number | null;
  competitors: CompetitorInfo[];
  center: { lat: number; lng: number };
  showHeat: boolean;
  showRings: boolean;
  sweepKey: number; // increment to trigger a scan sweep
  onSelect: (id: number) => void;
}

export function ScoutMap({
  results,
  selectedId,
  competitors,
  center,
  showHeat,
  showRings,
  sweepKey,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const ringsRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });
    // Esri World Dark Gray — free, keyless raster tiles
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
      }
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    ringsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pan to area center when it changes
  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], 14, { animate: true });
  }, [center.lat, center.lng]);

  // draw heat layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (showHeat && results.length > 0) {
      const maxLost = Math.max(...results.map((r) => r.lostRevenueKes), 1);
      const points: Array<[number, number, number]> = results.map((r) => [
        r.lat,
        r.lng,
        0.25 + 0.75 * (r.lostRevenueKes / maxLost),
      ]);
      const heat = new HeatLayer(points, 46);
      heat.addTo(map);
      heatRef.current = heat;
    }
  }, [showHeat, results]);

  // draw business markers
  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    for (const b of results) {
      const isSel = b.id === selectedId;
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: isSel ? 10 : 5 + Math.min(6, b.lostRevenueKes / 150000),
        color: isSel ? "hsl(188 86% 65%)" : scoreColor(b.scores.visibility),
        weight: isSel ? 2.5 : 1.5,
        fillColor: scoreColor(b.scores.visibility),
        fillOpacity: isSel ? 0.9 : 0.55,
      });
      marker.bindTooltip(
        `<div style="font-family:'JetBrains Mono',monospace">
           <div style="font-weight:700">${b.name}</div>
           <div style="color:hsl(215 25% 58%);font-size:10px">${CATEGORY_META[b.category].label} · ${b.area}</div>
           <div>VIS ${b.scores.visibility}/100 · leaking ${(b.lostRevenueKes / 1000).toFixed(0)}K/mo</div>
         </div>`,
        { className: "gs-tooltip", direction: "top", offset: [0, -8] }
      );
      marker.on("click", () => onSelectRef.current(b.id));
      group.addLayer(marker);
    }
  }, [results, selectedId]);

  // competitor rings around selected business
  useEffect(() => {
    const group = ringsRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showRings || selectedId == null) return;
    const sel = results.find((r) => r.id === selectedId);
    if (!sel) return;
    L.circle([sel.lat, sel.lng], {
      radius: 300,
      color: "hsl(292 91% 70%)",
      weight: 1,
      dashArray: "4 4",
      fill: false,
    })
      .bindTooltip("CAPTURE RADIUS 300m", { className: "gs-tooltip", sticky: true })
      .addTo(group);
    for (const c of competitors) {
      L.circle([sel.lat, sel.lng], {
        radius: c.distanceKm * 1000,
        color: "hsl(292 91% 70% / 0.55)",
        weight: 1,
        dashArray: "2 6",
        fill: false,
      }).addTo(group);
    }
  }, [showRings, selectedId, competitors, results]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {sweepKey > 0 && (
        <div
          key={sweepKey}
          className="map-sweep pointer-events-none absolute left-1/2 top-1/2 z-[500] h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        />
      )}
    </div>
  );
}
