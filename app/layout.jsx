import "./globals.css";

export const metadata = {
  title: "MuralForge",
  description:
    "Upload a wall photo, describe the mural, and see it painted on your actual wall — photoreal mockups for muralists and their clients.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
