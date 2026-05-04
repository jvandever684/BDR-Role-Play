"use client";

import { useRef, useState } from "react";
import { scenarios } from "@/lib/scenarios";

type TranscriptItem = { speaker: "BDR" | "AI Service Manager" | "System"; text: string };

type ScoreResult = {
  scores?: Record<string, number>;
  summary?: string;
  didTheyTryToCloseSale?: boolean;
  strengths?: string[];
  improvements?: string[];
  betterLines?: string[];
  raw?: string;
};

export default function Home() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [status, setStatus] = useState("Not started");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  async function startCall() {
    setStatus("Starting...");
    setScore(null);
    setTranscript([]);

    const tokenResponse = await fetch("/api/realtime-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId })
    });

    const tokenData = await tokenResponse.json();
    const clientSecret = tokenData?.value || tokenData?.client_secret?.value;
    if (!clientSecret) {
      setStatus("Could not get Realtime client secret.");
      console.error(tokenData);
      return;
    }

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioRef.current = audioEl;

    pc.ontrack = (event) => {
      audioEl.srcObject = event.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    pc.addTrack(stream.getAudioTracks()[0]);

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;

    dc.onopen = () => {
      setStatus("Live call in progress");
      dc.send(JSON.stringify({
        type: "response.create",
        response: { modalities: ["audio", "text"] }
      }));
    };

    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          setTranscript((prev) => [...prev, { speaker: "BDR", text: msg.transcript }]);
        }

        if (msg.type === "response.audio_transcript.done" || msg.type === "response.output_text.done") {
          const text = msg.transcript || msg.text;
          if (text) setTranscript((prev) => [...prev, { speaker: "AI Service Manager", text }]);
        }
      } catch (error) {
        console.log("Realtime event", event.data);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const model = process.env.NEXT_PUBLIC_REALTIME_MODEL || "gpt-realtime";
    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime/calls?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      setStatus("WebRTC connection failed.");
      console.error(errorText);
      return;
    }

    const answer = { type: "answer" as RTCSdpType, sdp: await sdpResponse.text() };
    await pc.setRemoteDescription(answer);
  }

  async function endCall() {
    setStatus("Call ended");
    dcRef.current?.close();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    await scoreCall();
  }

  async function scoreCall() {
    setIsScoring(true);
    const response = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    const result = await response.json();
    setScore(result);
    setIsScoring(false);
  }

  const total = score?.scores ? Object.values(score.scores).reduce((a, b) => a + b, 0) : 0;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34 }}>BDR Voice Roleplay</h1>
          <p style={{ marginTop: 8, color: "#667085" }}>Practice demo-setting calls for Dealerlogix + Text2Drive with a skeptical Service Manager.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={startCall}>Start Voice Call</button>
          <button className="btn btn-danger" onClick={endCall}>End & Score</button>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
        <aside className="card" style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Scenario</h2>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d0d5dd" }}>
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "#f2f4f7" }}>
            <b>Status</b>
            <p style={{ marginBottom: 0 }}>{status}</p>
          </div>

          <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "#fff7ed", color: "#7c2d12" }}>
            <b>Goal</b>
            <p style={{ marginBottom: 0 }}>Set a relevant demo with a product specialist. Do not close the full sale.</p>
          </div>
        </aside>

        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Transcript</h2>
          <div style={{ minHeight: 420, maxHeight: 520, overflow: "auto", background: "#fbfcfe", borderRadius: 16, padding: 16, border: "1px solid #eef1f7" }}>
            {transcript.length === 0 ? <p style={{ color: "#667085" }}>Transcript appears here after the call starts.</p> : transcript.map((m, i) => (
              <div key={i} style={{ marginBottom: 14, display: "flex", justifyContent: m.speaker === "BDR" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "75%", padding: 14, borderRadius: 16, background: m.speaker === "BDR" ? "#172033" : "#eef1f7", color: m.speaker === "BDR" ? "white" : "#172033" }}>
                  <b style={{ fontSize: 12, opacity: 0.75 }}>{m.speaker}</b>
                  <p style={{ margin: "6px 0 0" }}>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="card" style={{ marginTop: 20, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Scorecard</h2>
        {isScoring && <p>Scoring call...</p>}
        {!score && !isScoring && <p style={{ color: "#667085" }}>End the call to score the rep.</p>}
        {score && (
          <div>
            <h3>Total: {total}/70</h3>
            {score.summary && <p>{score.summary}</p>}
            {score.scores && <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>{Object.entries(score.scores).map(([k, v]) => (
              <div key={k} style={{ padding: 12, background: "#f2f4f7", borderRadius: 12 }}><b>{k}</b><br />{v}/10</div>
            ))}</div>}
            {score.didTheyTryToCloseSale && <p style={{ color: "#b42318" }}><b>Coaching flag:</b> Rep drifted toward closing the sale instead of setting the demo.</p>}
            {score.strengths?.length ? <><h4>Strengths</h4><ul>{score.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></> : null}
            {score.improvements?.length ? <><h4>Improvements</h4><ul>{score.improvements.map((x, i) => <li key={i}>{x}</li>)}</ul></> : null}
            {score.betterLines?.length ? <><h4>Better Lines</h4><ul>{score.betterLines.map((x, i) => <li key={i}>{x}</li>)}</ul></> : null}
            {score.raw && <pre>{score.raw}</pre>}
          </div>
        )}
      </section>
    </main>
  );
}
