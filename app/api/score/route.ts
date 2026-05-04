import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const { transcript } = await req.json();

  const scoringPrompt = `
You are scoring a BDR practice call. The BDR's job is to generate interest and set a demo, not close a full sale.

Product context: combined Dealerlogix + Text2Drive for dealership service departments.

Score 1-10 for each category:
1. Opening & Hook
2. Discovery Depth
3. Follow-Up Questions
4. Pain Identification
5. Pain Restatement
6. Value Alignment to Dealerlogix + Text2Drive
7. Close for Demo

Return valid JSON only with this structure:
{
  "scores": {
    "opening": 0,
    "discovery": 0,
    "followUp": 0,
    "pain": 0,
    "restate": 0,
    "value": 0,
    "demo": 0
  },
  "summary": "brief coaching summary",
  "didTheyTryToCloseSale": false,
  "strengths": ["..."],
  "improvements": ["..."],
  "betterLines": ["...", "..."]
}

Transcript:
${JSON.stringify(transcript, null, 2)}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.SCORING_MODEL || "gpt-4.1-mini",
      input: scoringPrompt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
  }

  const data = await response.json();
  const text = data.output_text || data.output?.[0]?.content?.[0]?.text || "{}";

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ raw: text });
  }
}
