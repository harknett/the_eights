import { NextResponse } from "next/server";

/** Lets it live on a phone's home screen, which is where it gets used. */
export function GET() {
  return NextResponse.json({
    name: "The Eights",
    short_name: "Eights",
    description: "Eight things a day, a week, a fortnight. Tracked simply.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#2f6f5e",
    orientation: "portrait",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  });
}
