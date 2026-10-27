import { Hono } from "hono";
import "dotenv/config"; 

const app = new Hono();

// 1. Define the TypeScript Interfaces for Google's Response
type GooglePlaceResult = {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

type GooglePlacesResponse = {
  status: string;
  results: GooglePlaceResult[];
  error_message?: string;
};

function calculateVisibilityScore(rating: number, reviews: number, hasWebsite: boolean) {
  const ratingScore = (rating / 5) * 100;
  const reviewScore = Math.min((reviews / 50) * 100, 100);
  const mapsScore = (ratingScore * 0.6) + (reviewScore * 0.4);
  const webScore = hasWebsite ? 60 : 0; 
  const totalScore = (mapsScore * 0.45) + (webScore * 0.55);
  const missedCapture = (100 - totalScore) / 100;
  const leakKes = Math.round(1500 * missedCapture * 0.1 * 5000);

  return {
    visibilityScore: Math.round(totalScore),
    mapsScore: Math.round(mapsScore),
    webScore: Math.round(webScore),
    leakKes,
  };
}

app.post("/api/scan", async (c) => {
  try {
    const { niche, location } = await c.req.json();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return c.json({ error: "Google Places API key is missing" }, 500);
    }

    const query = encodeURIComponent(`${niche} in ${location}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

    const response = await fetch(url);
    
    // 2. Cast the response to your defined type
    const data = (await response.json()) as GooglePlacesResponse;

    if (data.status !== "OK") {
      return c.json({ error: "Google API failed", details: data }, 500);
    }

    // Now data.results is strictly typed!
    const results = data.results.map((place) => {
      const hasWebsite = !!place.website;
      const scores = calculateVisibilityScore(place.rating || 0, place.user_ratings_total || 0, hasWebsite);

      return {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        ...scores,
      };
    });

    results.sort((a, b) => a.visibilityScore - b.visibilityScore);

    return c.json({ success: true, results });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;