import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header'; 
import './App.css';

import Welcome from './users/Welcome';
import Login from './pages/Login';
import Home from './pages/Home';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="app-container">
        <Header />
        {/* <p>Willkommen in deiner Geburtstagsverwaltungs-App!</p> */}
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to="/home" /> : <Navigate to="/login" />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
          <Route path="/registrieren" element={<Welcome />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;