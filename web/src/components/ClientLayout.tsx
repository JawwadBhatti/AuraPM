"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/register";

  return (
    <div className="flex min-h-screen break-words">
      {!isAuth && <Sidebar />}
      <main className={`flex-1 flex flex-col min-w-0 overflow-x-hidden ${!isAuth ? "ml-48" : ""}`}>
        {children}
      </main>
    </div>
  );
}
