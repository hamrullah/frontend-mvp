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
import Mystore from "./pages/project/Mystore";
import Redemp from "./pages/project/Redem";
import Commision from "./pages/affiliate/Commision";
import MyAccount from "./pages/affiliate/MyAccount";
import Preview from "./pages/affiliate/Preview";
import Payout from "./pages/affiliate/Payout";

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
          <Route path="/my-store" element={<Mystore />} />
          <Route path="/redemption" element={<Redemp />} />
          <Route path="/affiliate-commision" element={<Commision />} />
          <Route path="/my-affiliate" element={<MyAccount />} />
          <Route path="/affiliate-commision-new" element={<Preview />} />
          <Route path="/affiliate-out" element={<Payout />} />
          <Route path="//affiliate-report" element={<Payout />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
