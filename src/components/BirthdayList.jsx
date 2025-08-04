import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import "../styles/BirthdayList.css";

function BirthdayList() {
    const [birthdays, setBirthdays] = useState([]);
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [user, setUser] = useState(null);

    // Écoute l'état d'authentification
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    // Charger les anniversaires quand l'utilisateur est prêt
    useEffect(() => {
        const fetchBirthdays = async () => {
            if (!user) return;
            const q = query(
                collection(db, "birthdays"),
                where("uid", "==", user.uid)
            );
            const querySnapshot = await getDocs(q);
            setBirthdays(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchBirthdays();
    }, [user]);

    // Ajouter un anniversaire
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!user) return;
        await addDoc(collection(db, "birthdays"), {
            uid: user.uid,
            name,
            date
        });
        setName("");
        setDate("");
        // Recharge la liste
        const q = query(
            collection(db, "birthdays"),
            where("uid", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        setBirthdays(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    return (
        <div className="birthday-list-container">
            <h3>Geburtstage verwalten</h3>
            <form className="birthday-list-form" onSubmit={handleAdd}>
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                />
                <button type="submit">Hinzufügen</button>
            </form>
            <ul className="birthday-list">
                {birthdays.map(b => (
                    <li key={b.id}>
                        <span className="birthday-name">{b.name}</span>
                        <span className="birthday-date">{b.date}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default BirthdayList;