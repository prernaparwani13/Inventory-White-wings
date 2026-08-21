import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "White Wings | Inventory Management System",
  description: "Modern, scalable, and secure warehouse and inventory operations platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
