"use client";

import { useEffect, useState } from "react";

type SessionInfo = { id: string; course: string; classDate: string };

export default function CheckInPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session");
    if (!id) {
      setStatus("error");
      setMessage("This check-in link is incomplete.");
      return;
    }
    fetch(`/api/session?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setSession(await response.json());
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setMessage("This attendance session is no longer available.");
      });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !name.trim()) return;
    setStatus("submitting");
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, name }),
    });
    if (response.ok) {
      setStatus("success");
      setMessage("You’re signed in. You can close this page.");
    } else {
      setStatus("error");
      setMessage("Check-in failed. Please try again or tell your instructor.");
    }
  }

  if (status === "loading") return <main className="student-screen"><p>Opening check-in…</p></main>;
  if (status === "success") {
    return <main className="student-screen"><section className="student-card success-card"><span>✓</span><h1>Attendance recorded</h1><p>{message}</p></section></main>;
  }
  if (status === "error" && !session) {
    return <main className="student-screen"><section className="student-card"><h1>Unable to check in</h1><p className="error">{message}</p></section></main>;
  }

  return (
    <main className="student-screen">
      <form className="student-card" onSubmit={submit}>
        <p className="eyebrow">Attendance check-in</p>
        <h1>{session?.course}</h1>
        <p>Enter the name your instructor knows you by.</p>
        <label htmlFor="student-name">Full name</label>
        <input id="student-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" required autoFocus />
        <button disabled={status === "submitting"}>{status === "submitting" ? "Signing in…" : "Sign in"}</button>
        {status === "error" && <p className="error" role="alert">{message}</p>}
      </form>
    </main>
  );
}
