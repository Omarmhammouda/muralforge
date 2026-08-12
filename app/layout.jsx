import "./globals.css";

export const metadata = {
  title: "MuralForge — Mural Business Platform",
  description:
    "Manage clients, projects, mural mockups, and professional proposals — the operating system for mural artists and studios.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
