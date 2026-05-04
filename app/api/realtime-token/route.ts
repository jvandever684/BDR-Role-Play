import { NextRequest, NextResponse } from "next/server";
import { getScenario } from "@/lib/scenarios";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const scenario = getScenario(body.scenarioId);

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: process.env.REALTIME_MODEL || "gpt-realtime",
        instructions: scenario.instructions,
        audio: {
          output: {
            voice: process.env.REALTIME_VOICE || "marin"
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
