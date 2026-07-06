import { Outlet } from "react-router-dom";
import { Github, Zap } from "lucide-react";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="aurora" aria-hidden />
      <div className="grid-overlay" aria-hidden />
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-faint sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-violet-soft" />
            <span>NexusDrop — instant game top-ups, delivered.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>ACID-safe wallet · JWT secured</span>
            <Github className="size-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
