import { Outlet } from 'react-router-dom';
import SuperAdminBanner from './SuperAdminBanner';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CompassBackground from './CompassBackground';

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <CompassBackground />
      <SuperAdminBanner />
      <MobileNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}