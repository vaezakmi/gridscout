import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CATEGORY_META,
  type BusinessScanResult,
  type CompetitorInfo,
} from "@contracts/grid";
import { fmtCompactKes, scoreColor } from "@/lib/format";

const ACCENT = "hsl(188 86% 65%)";
const MAGENTA = "hsl(292 91% 70%)";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

type HeatPoint = [lat: number, lng: number, intensity: number];

/** Additive canvas heat layer (no external dependency), pinned to the viewport so it never drifts while panning. */
class HeatLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private map: L.Map | null = null;
  private points: HeatPoint[];
  private radius: number;
  private raf = 0;

  constructor(points: HeatPoint[], radius: number) {
    super();
    this.points = points;
    this.radius = radius;
  }

  private schedule = () => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  };

  onAdd(map: L.Map): this {
    this.map = map;
    // leaflet-zoom-hide: hidden during zoom animation, redrawn on zoomend
    const canvas = L.DomUtil.create("canvas", "leaflet-zoom-hide") as HTMLCanvasElement;
    canvas.style.cssText = "position:absolute;pointer-events:none;";
    const pane = map.getPanes().overlayPane;
    pane.insertBefore(canvas, pane.firstChild); // keep markers above the glow
    this.canvas = canvas;
    map.on("move moveend zoomend resize viewreset", this.schedule);
    this.draw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off("move moveend zoomend resize viewreset", this.schedule);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas?.remove();
    this.canvas = null;
    this.map = null;
    return this;
  }

  private draw() {
    const map = this.map;
    const canvas = this.canvas;
    if (!map || !canvas) return;

    const size = map.getSize();
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }
    // The overlay pane moves while panning; counter-position so the canvas stays glued to the viewport
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";

    for (const [lat, lng, intensity] of this.points) {
      const p = map.latLngToContainerPoint([lat, lng]);
      const r = this.radius * (0.7 + intensity * 0.6);
      if (p.x < -r || p.y < -r || p.x > size.x + r || p.y > size.y + r) continue;
      const a = 0.1 + intensity * 0.22;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
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

const tipStyle = `font-family:'JetBrains Mono',monospace`;

const businessTip = (b: BusinessScanResult) =>
  `<div style="${tipStyle}">
     <div style="font-weight:700">${esc(b.name)}</div>
     <div style="color:hsl(215 25% 58%);font-size:10px">${esc(CATEGORY_META[b.category].label)} · ${esc(b.area)}</div>
     <div>VIS ${b.scores.visibility}/100 · leaking ${esc(fmtCompactKes(b.lostRevenueKes))}/mo</div>
   </div>`;

const competitorTip = (c: CompetitorInfo) =>
  `<div style="${tipStyle}">
     <div style="font-weight:700">${esc(c.name)}</div>
     <div>VIS ${c.visibilityScore}/100 · ${c.distanceKm.toFixed(2)} km away</div>
     <div style="color:hsl(215 25% 58%);font-size:10px">${c.reviewCount} reviews · ${
       c.keywordRank ? `ranks #${c.keywordRank}` : "unranked"
     }</div>
   </div>`;

const SELECTED_STYLE: L.CircleMarkerOptions = {
  radius: 11,
  color: ACCENT,
  weight: 2.5,
  fillOpacity: 0.9,
};

interface Props {
  results: BusinessScanResult[];
  selectedId: number | null;
  competitors: CompetitorInfo[];
  center: { lat: number; lng: number };
  zoom?: number; // default zoom for the sector (AREA_META[area].zoom)
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
  zoom = 14,
  showHeat,
  showRings,
  sweepKey,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const ringsRef = useRef<L.LayerGroup | null>(null);
  const entriesRef = useRef(new Map<number, { marker: L.CircleMarker; base: L.CircleMarkerOptions }>());
  const prevSelRef = useRef<number | null>(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const byId = useMemo(() => new Map(results.map((r) => [r.id, r])), [results]);

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    });
    // Esri World Dark Gray: free, keyless raster tiles
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>' },
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 },
    ).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    ringsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      ringsRef.current = null;
      entriesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep Leaflet in sync when the grid cell resizes (breakpoints, panel changes)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fly to the sector when it changes
  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], zoomRef.current, { animate: true });
  }, [center.lat, center.lng, zoom]);

  // frame the results after each scan (never zooms in further than the sector default)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || results.length === 0) return;
    const bounds = L.latLngBounds(results.map((r) => [r.lat, r.lng] as L.LatLngTuple));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: zoomRef.current, animate: true });
  }, [results, sweepKey]);

  // heat layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showHeat || results.length === 0) return;
    const maxLost = Math.max(...results.map((r) => r.lostRevenueKes), 1);
    const points: HeatPoint[] = results.map((r) => [
      r.lat,
      r.lng,
      0.25 + 0.75 * (r.lostRevenueKes / maxLost),
    ]);
    const heat = new HeatLayer(points, 46).addTo(map);
    return () => {
      heat.remove();
    };
  }, [showHeat, results]);

  // business markers (rebuilt only when results change; selection is restyled below)
  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    entriesRef.current.clear();
    prevSelRef.current = null;

    const maxLost = Math.max(...results.map((r) => r.lostRevenueKes), 1);
    for (const b of results) {
      const color = scoreColor(b.scores.visibility);
      const base: L.CircleMarkerOptions = {
        radius: 4 + 7 * Math.sqrt(Math.max(b.lostRevenueKes, 0) / maxLost),
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.55,
      };
      const marker = L.circleMarker([b.lat, b.lng], base);
      marker.bindTooltip(businessTip(b), { className: "gs-tooltip", direction: "top", offset: [0, -8] });
      marker.on("click", () => onSelectRef.current(b.id));
      group.addLayer(marker);
      entriesRef.current.set(b.id, { marker, base });
    }
  }, [results]);

  // selection styling without rebuilding every marker
  useEffect(() => {
    const entries = entriesRef.current;
    const prev = prevSelRef.current !== null ? entries.get(prevSelRef.current) : undefined;
    if (prev) prev.marker.setStyle(prev.base);

    const cur = selectedId !== null ? entries.get(selectedId) : undefined;
    if (cur) {
      cur.marker.setStyle(SELECTED_STYLE);
      cur.marker.bringToFront();
    }
    prevSelRef.current = cur ? selectedId : null;
  }, [selectedId, results]);

  // pan to the selection if it is off-screen or near an edge
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId === null) return;
    const sel = byId.get(selectedId);
    if (!sel) return;
    if (!map.getBounds().pad(-0.25).contains([sel.lat, sel.lng])) {
      map.panTo([sel.lat, sel.lng], { animate: true });
    }
  }, [selectedId, byId]);

  // capture radius + competitor links around the selection
  useEffect(() => {
    const group = ringsRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showRings || selectedId === null) return;
    const sel = byId.get(selectedId);
    if (!sel) return;

    L.circle([sel.lat, sel.lng], {
      radius: 300,
      color: MAGENTA,
      weight: 1,
      dashArray: "4 4",
      fill: false,
    })
      .bindTooltip("CAPTURE RADIUS 300m", { className: "gs-tooltip", sticky: true })
      .addTo(group);

    for (const c of competitors) {
      const peer = byId.get(c.id);
      if (peer) {
        // we know where this competitor is: link to it and highlight it
        L.polyline(
          [[sel.lat, sel.lng], [peer.lat, peer.lng]],
          { color: MAGENTA, weight: 1, opacity: 0.5, dashArray: "2 6", interactive: false },
        ).addTo(group);
        L.circleMarker([peer.lat, peer.lng], {
          radius: 9,
          color: scoreColor(c.visibilityScore),
          weight: 1.5,
          dashArray: "3 3",
          fill: false,
        })
          .bindTooltip(competitorTip(c), { className: "gs-tooltip", direction: "top", offset: [0, -8] })
          .on("click", () => onSelectRef.current(c.id))
          .addTo(group);
      } else {
        // not in the current scan: fall back to a distance ring
        L.circle([sel.lat, sel.lng], {
          radius: c.distanceKm * 1000,
          color: MAGENTA,
          weight: 1,
          opacity: 0.55,
          dashArray: "2 6",
          fill: false,
          interactive: false,
        }).addTo(group);
      }
    }
  }, [showRings, selectedId, competitors, byId]);

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