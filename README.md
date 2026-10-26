# Classroom Attendance QR

A projector-ready QR code generator for classroom attendance. Paste the URL for an attendance form, generate the code, and present it full-screen for students to scan.

## Run locally

Serve the `dist` directory with any static web server, for example:

```bash
python3 -m http.server 4173 --directory dist
```

Then open <http://localhost:4173>.

## Privacy

The attendance URL is encoded in the browser. This project does not submit or store attendance data; the destination form handles sign-in.

