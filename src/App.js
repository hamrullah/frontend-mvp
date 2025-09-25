import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./components/Login";
import Projects from "./pages/project/Project";
import Barangs from "./pages/barang/Barang";
import Inventorys from "./pages/inventory/Inventory";
import Transaksis from "./pages/transaksi/Transaksi";
import Chart from "./pages/project/Grafik";
import Vendors from "./pages/vendor/vendors";
import Affiliates from "./pages/affiliate/Affiliate";
import Members from "./pages/member/Member";

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/barangs" element={<Barangs />} />
          <Route path="/inventory" element={<Inventorys />} />
          <Route path="/transactions" element={<Transaksis />} />
          <Route path="/chart" element={<Chart />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/affiliate" element={<Affiliates />} />
          <Route path="/member" element={<Members />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
