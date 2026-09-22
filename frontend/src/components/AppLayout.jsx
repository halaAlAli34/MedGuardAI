import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
