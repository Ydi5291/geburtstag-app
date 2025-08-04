import React from "react";
import BirthdayList from "../components/BirthdayList";

function Home() {
  return (
    <div>
      <p>Hier kannst du deine Geburtstage verwalten.</p>
      <BirthdayList />
    </div>
  );
}

export default Home;