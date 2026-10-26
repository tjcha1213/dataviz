"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Checkin = { id: number; name: string; checkedInAt: string };
type Session = {
  id: string;
  course: string;
  classDate: string;
  createdAt: string;
  checkins: Checkin[];
};

const STORAGE_KEY = "classroom-attendance-session";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function AttendanceDisplay() {
  const [session, setSession] = useState<Session | null>(null);
  const [course, setCourse] = useState("Course Attendance");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const refreshSession = useCallback(async (id: string, quiet = false) => {
    try {
      const response = await fetch(`/api/session?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Session not found");
      const data = (await response.json()) as Session;
      setSession(data);
      setError("");
    } catch {
      if (!quiet) localStorage.removeItem(STORAGE_KEY);
      if (!quiet) setSession(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { id: string; date: string };
        if (parsed.date === todayKey()) refreshSession(parsed.id);
        else {
          localStorage.removeItem(STORAGE_KEY);
          setLoading(false);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      }
    } else setLoading(false);
    return () => window.clearInterval(timer);
  }, [refreshSession]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => refreshSession(session.id, true), 2500);
    return () => window.clearInterval(timer);
  }, [refreshSession, session?.id]);

  useEffect(() => {
    if (!session) return;
    const checkinUrl = `${window.location.origin}/check-in?session=${encodeURIComponent(session.id)}`;
    QRCode.toDataURL(checkinUrl, {
      width: 1200,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#123d38", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setError("The QR code could not be generated. Refresh the page to try again."));
  }, [session?.id]);

  async function startSession(event: React.FormEvent) {
    event.preventDefault();
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ course }),
      });
      if (!response.ok) throw new Error("Unable to start session");
      const data = (await response.json()) as Session;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: data.id, date: todayKey() }));
      setSession(data);
    } catch {
      setError("Could not start attendance. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  function downloadAttendance() {
    if (!session || session.checkins.length === 0) return;

    const csvCell = (value: string) => {
      let safe = value.replace(/[\r\n]+/g, " ").trim();
      if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const rows = [
      ["Course", session.course],
      ["Class date", session.classDate],
      ["Exported at", new Date().toLocaleString()],
      [],
      ["Student name", "Check-in time"],
      ...session.checkins.map((checkin) => [
        checkin.name,
        new Date(checkin.checkedInAt).toLocaleString(),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const courseSlug = session.course
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "class";
    link.href = url;
    link.download = `${courseSlug}-attendance-${session.classDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const formattedDate = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now),
    [now.toDateString()]
  );
  const formattedTime = useMemo(
    () => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now),
    [now]
  );

  if (loading) return <main className="loading-screen">Preparing attendance…</main>;

  if (!session) {
    return (
      <main className="setup-screen">
        <form className="setup-card" onSubmit={startSession}>
          <p className="eyebrow">New attendance session</p>
          <h1>Ready for class?</h1>
          <p>Enter the course name. The projector view and student QR code will be created automatically.</p>
          <label htmlFor="course">Course name</label>
          <input
            id="course"
            value={course}
            onChange={(event) => setCourse(event.target.value)}
            maxLength={80}
            required
            autoFocus
          />
          <button disabled={starting}>{starting ? "Starting…" : "Start attendance"}</button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="attendance-screen">
      <header className="class-header">
        <div>
          <p className="eyebrow">Live attendance</p>
          <h1>{session.course}</h1>
        </div>
        <div className="date-time" aria-label={`${formattedDate}, ${formattedTime}`}>
          <strong>{formattedDate}</strong>
          <span>{formattedTime}</span>
        </div>
      </header>

      <section className="qr-section" aria-label="Student check-in QR code">
        <div className="qr-frame">
          {qrDataUrl ? <img src={qrDataUrl} alt="QR code for student attendance check-in" /> : <div className="qr-loading">Generating QR…</div>}
        </div>
        <p>Scan to sign in</p>
      </section>

      <section className="roster" aria-labelledby="roster-title">
        <div className="roster-heading">
          <h2 id="roster-title">Signed in</h2>
          <div className="roster-actions">
            <span>{session.checkins.length} {session.checkins.length === 1 ? "student" : "students"}</span>
            <button
              className="download-button"
              type="button"
              onClick={downloadAttendance}
              disabled={session.checkins.length === 0}
              title={session.checkins.length === 0 ? "No attendance to download yet" : "Download attendance as CSV"}
            >
              <span aria-hidden="true">↓</span> Download CSV
            </button>
          </div>
        </div>
        {session.checkins.length ? (
          <ol className="name-list">
            {session.checkins.map((checkin) => (
              <li key={checkin.id}>
                <span className="initial">{checkin.name.charAt(0).toUpperCase()}</span>
                <strong>{checkin.name}</strong>
                <time>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(checkin.checkedInAt))}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-roster">Waiting for the first student to sign in…</p>
        )}
      </section>
      {error && <p className="display-error" role="alert">{error}</p>}
    </main>
  );
}
