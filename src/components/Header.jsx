import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import "../styles/Header.css";

function Header() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <header className="app-header">
      <div className="app-logo">🎉 Geburtstag-App</div>
      <button className="logout-btn" onClick={handleLogout}>
        Abmelden
      </button>
    </header>
  );
}

export default Header;