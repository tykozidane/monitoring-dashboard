
import './App.css'; // Optional: Add styles here
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar";

// Pages
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [openSidebar, setOpenSidebar] = useState(false);

  return (
    <div className="min-h-screen flex ">

      {/* SIDEBAR */}
      <Sidebar 
        isOpen={openSidebar} 
        onClose={() => setOpenSidebar(false)} 
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 ml-0 transition-all">
        
        {/* HAMBURGER BUTTON */}
        <button
          className="text-2xl mb-4 md:flex hidden text-black"
          onClick={() => setOpenSidebar(true)}
        >
          ☰
        </button>

        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}

