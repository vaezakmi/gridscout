import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import AdminFixes from "./pages/AdminFixes"
import AdminOsm from './pages/AdminOsm'
import OwnerView from "./pages/trust/OwnerView";
import CfoDashboard from "./pages/trust/CfoDashboard";
import KejaBoard from "./pages/trust/KejaBoard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/app" element={<Dashboard />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/admin/fixes" element={<AdminFixes />} />
      <Route path="/admin/osm" element={<AdminOsm />} />
      <Route path="/login" element={<Login />} />
      <Route path="/b/:id" element={<OwnerView />} />
      <Route path="/app/cfo" element={<CfoDashboard />} />
      <Route path="/app/keja" element={<KejaBoard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}