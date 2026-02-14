import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/weather?city=Miami&state=FL
 * or GET /api/weather?lat=25.76&lon=-80.19
 *
 * Proxies OpenWeatherMap API to auto-fill daily log weather fields.
 * Falls back to a simple geocoding approach if lat/lon not provided.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Weather API key not configured. Set OPENWEATHER_API_KEY in environment variables." },
      { status: 503 }
    );
  }

  try {
    let weatherUrl: string;

    if (lat && lon) {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
    } else if (city) {
      const location = state ? `${city},${state},US` : city;
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=imperial&appid=${apiKey}`;
    } else {
      return NextResponse.json(
        { error: "Provide lat/lon or city/state parameters" },
        { status: 400 }
      );
    }

    const res = await fetch(weatherUrl);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || "Failed to fetch weather data" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Map OpenWeatherMap conditions to our weather_conditions values
    const mainCondition = (data.weather?.[0]?.main || "").toLowerCase();
    let weather_conditions = "cloudy";
    if (mainCondition === "clear") weather_conditions = "sunny";
    else if (mainCondition === "clouds") weather_conditions = "cloudy";
    else if (["rain", "drizzle", "thunderstorm"].includes(mainCondition)) weather_conditions = "rain";
    else if (mainCondition === "snow") weather_conditions = "snow";
    else if (mainCondition === "wind" || (data.wind?.speed && data.wind.speed > 25)) weather_conditions = "storm";

    const result = {
      weather_conditions,
      weather_temp_high: Math.round(data.main?.temp_max ?? data.main?.temp ?? 0),
      weather_temp_low: Math.round(data.main?.temp_min ?? data.main?.temp ?? 0),
      weather_wind_mph: Math.round(data.wind?.speed ?? 0),
      weather_humidity_pct: Math.round(data.main?.humidity ?? 0),
      description: data.weather?.[0]?.description || "",
      location_name: data.name || "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
