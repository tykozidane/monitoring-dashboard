import { Link } from "react-router-dom";

export default function Sidebar({ isOpen, onClose }) {
    return (
        <div>
        {/* Overlay ketika sidebar terbuka */}
        {isOpen && (
            <div
            className="fixed inset-0 bg-black/40 z-20 md:flex hidden"
            onClick={onClose}
            />
        )}

        {/* SIDEBAR */}
        <div
            className={`
            fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-998 p-4 
            transform transition-transform duration-300 
            ${isOpen ? "translate-x-0" : "-translate-x-64"}
            `}
        >
            {/* CLOSE BUTTON */}
            <button
            className="text-xl mb-4"
            onClick={onClose}
            >
            ✕
            </button>

            <h2 className="text-xl font-bold mb-6">Menu</h2>

            {/* NAVIGATION LINKS */}
            <nav className="flex flex-col gap-3">
            <Link className="hover:text-blue-600" to="/" onClick={onClose}>
                Dashboard
            </Link>
            <Link className="hover:text-blue-600" to="/devices" onClick={onClose}>
                Devices
            </Link>
            <Link className="hover:text-blue-600" to="/map" onClick={onClose}>
                Map
            </Link>
            <Link className="hover:text-blue-600" to="/settings" onClick={onClose}>
                Settings
            </Link>
            </nav>
        </div>
        </div>
    );
}
