import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";
import BirthdayNotifications from "./BirthdayNotifications";
import { useUpcomingBirthdays } from "../hooks/useUpcomingBirthdays";
import "../styles/BirthdayList.css";

function calculateAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function BirthdayList() {
    const [birthdays, setBirthdays] = useState([]);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [date, setDate] = useState("");
    const [user, setUser] = useState(null);
    const [editId, setEditId] = useState(null);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editDate, setEditDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [abortController, setAbortController] = useState(null);

    // Hook pour les notifications d'anniversaires
    const upcomingBirthdays = useUpcomingBirthdays(birthdays);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchBirthdays = async () => {
            if (!user) return;
            
            try {
                setLoading(true);
                setError("");
                const q = query(
                    collection(db, "birthdays"),
                    where("uid", "==", user.uid)
                );
                const querySnapshot = await getDocs(q);
                setBirthdays(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Fehler beim Laden der Geburtstage:", err);
                setError("Fehler beim Laden der Geburtstage");
            } finally {
                setLoading(false);
            }
        };
        fetchBirthdays();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!user) {
            setError("Sie müssen angemeldet sein, um einen Geburtstag hinzuzufügen");
            return;
        }
        
        // Datenvalidierung
        if (!firstName.trim() || !lastName.trim() || !date) {
            setError("Alle Felder sind erforderlich");
            return;
        }
        
        // Überprüfen, ob der Geburtstag bereits existiert
        if (birthdays.some(b => b.firstName.toLowerCase() === firstName.trim().toLowerCase() && 
                              b.lastName.toLowerCase() === lastName.trim().toLowerCase() && 
                              b.date === date)) {
            setError("Dieser Geburtstag existiert bereits!");
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            
            console.log("Versuch, Geburtstag hinzuzufügen:", { firstName: firstName.trim(), lastName: lastName.trim(), date });
            
            // Essayer d'abord sans timeout pour avoir l'erreur exacte
            const docRef = await addDoc(collection(db, "birthdays"), {
                uid: user.uid,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                date
            });
            
            console.log("Geburtstag erfolgreich hinzugefügt:", docRef.id);
            
            setBirthdays([
                ...birthdays,
                { id: docRef.id, uid: user.uid, firstName: firstName.trim(), lastName: lastName.trim(), date }
            ]);
            setFirstName("");
            setLastName("");
            setDate("");
        } catch (err) {
            console.error("Fehler beim Hinzufügen:", err);
            console.error("Fehlercode:", err.code);
            console.error("Vollständige Nachricht:", err.message);
            
            if (err.code === 'permission-denied') {
                setError(`❌ FALSCHE FIRESTORE-REGELN\n\nSo beheben Sie das Problem:\n1. Gehen Sie zu https://console.firebase.google.com/\n2. Wählen Sie Ihr Projekt "geburtstag-app" aus\n3. Klicken Sie im linken Menü auf "Firestore Database"\n4. Klicken Sie auf den Tab "Rules"\n5. Ersetzen Sie den Inhalt durch:\n\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}\n\n6. Klicken Sie auf "Veröffentlichen"`);
            } else if (err.code === 'failed-precondition') {
                setError("❌ Erstellen Sie zuerst eine Firestore-Datenbank in der Firebase-Konsole");
            } else if (err.code === 'unavailable') {
                setError("❌ Firebase-Dienst nicht verfügbar. Bitte versuchen Sie es später erneut.");
            } else {
                setError(`❌ Fehler: ${err.code || 'unbekannt'} - ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Sind Sie sicher, dass Sie diesen Geburtstag löschen möchten?")) {
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            
            console.log("Versuch, Geburtstag zu löschen:", id);
            
            // Ajouter un timeout
            const deletePromise = deleteDoc(doc(db, "birthdays", id));
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout après 10 secondes')), 10000)
            );
            
            await Promise.race([deletePromise, timeoutPromise]);
            
            console.log("Löschen erfolgreich");
            setBirthdays(birthdays.filter(b => b.id !== id));
        } catch (err) {
            console.error("Fehler beim Löschen:", err);
            if (err.message.includes('Timeout')) {
                setError("Die Operation hat zu lange gedauert. Bitte überprüfen Sie Ihre Internetverbindung.");
            } else if (err.code === 'permission-denied') {
                setError("Zugriff verweigert. Bitte überprüfen Sie Ihre Firebase-Regeln.");
            } else {
                setError(`Fehler beim Löschen: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (b) => {
        setEditId(b.id);
        setEditFirstName(b.firstName);
        setEditLastName(b.lastName);
        setEditDate(b.date);
    };

    const handleUpdate = async (id) => {
        // Datenvalidierung
        if (!editFirstName.trim() || !editLastName.trim() || !editDate) {
            setError("Alle Felder sind erforderlich");
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            
            console.log("Versuch, Geburtstag zu aktualisieren:", { id, firstName: editFirstName.trim(), lastName: editLastName.trim(), date: editDate });
            
            // Ajouter un timeout
            const updatePromise = updateDoc(doc(db, "birthdays", id), {
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                date: editDate
            });
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout après 10 secondes')), 10000)
            );
            
            await Promise.race([updatePromise, timeoutPromise]);
            
            console.log("Aktualisierung erfolgreich");
            
            setBirthdays(birthdays.map(b =>
                b.id === id ? { ...b, firstName: editFirstName.trim(), lastName: editLastName.trim(), date: editDate } : b
            ));
            // Nettoyer les états d'édition
            setEditId(null);
            setEditFirstName("");
            setEditLastName("");
            setEditDate("");
        } catch (err) {
            console.error("Fehler bei der Aktualisierung:", err);
            if (err.message.includes('Timeout')) {
                setError("Die Operation hat zu lange gedauert. Bitte überprüfen Sie Ihre Internetverbindung.");
            } else if (err.code === 'permission-denied') {
                setError("Zugriff verweigert. Bitte überprüfen Sie Ihre Firebase-Regeln.");
            } else {
                setError(`Fehler bei der Aktualisierung: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
    setEditId(null);
    setEditFirstName("");
    setEditLastName("");
    setEditDate("");
    setError("");
    };

    const handleCancelOperation = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
        }
        setLoading(false);
        setError("Vorgang abgebrochen");
    };

    return (
        <div className="birthday-list-container">
            <h3>Geburtstage verwalten</h3>
            
            {/* Composant de notifications d'anniversaires */}
            <BirthdayNotifications upcomingBirthdays={upcomingBirthdays} />
            
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
            
            <form className="birthday-list-form" onSubmit={handleAdd}>
                <input
                    type="text"
                    placeholder="Vorname"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    disabled={loading}
                    required
                />
                <input
                    type="text"
                    placeholder="Nachname"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    disabled={loading}
                    required
                />
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    disabled={loading}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? "Wird hinzugefügt..." : "Hinzufügen"}
                </button>
                {loading && (
                    <button type="button" onClick={handleCancelOperation} style={{background: '#f44336'}}>
                        Abbrechen
                    </button>
                )}
            </form>
            <ul className="birthday-list">
                {birthdays.map(b => (
                    <li key={b.id}>
                        {editId === b.id ? (
                            <div className="edit-form">
                                <input
                                    type="text"
                                    value={editFirstName}
                                    onChange={e => setEditFirstName(e.target.value)}
                                    disabled={loading}
                                    placeholder="Vorname"
                                />
                                <input
                                    type="text"
                                    value={editLastName}
                                    onChange={e => setEditLastName(e.target.value)}
                                    disabled={loading}
                                    placeholder="Nachname"
                                />
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={e => setEditDate(e.target.value)}
                                    disabled={loading}
                                />
                                <div className="edit-buttons">
                                    <button onClick={() => handleUpdate(b.id)} disabled={loading}>
                                        {loading ? "Wird gespeichert..." : "Speichern"}
                                    </button>
                                    <button onClick={handleCancelEdit} disabled={loading}>Abbrechen</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div>
                                    <span className="birthday-name">{b.firstName} {b.lastName}</span>
                                    <div className="birthday-details">
                                        <span>📅 {new Date(b.date).toLocaleDateString('de-DE')}</span>
                                        <span>🎂 {calculateAge(b.date)} Jahre alt</span>
                                    </div>
                                </div>
                                <div>
                                    <button onClick={() => handleEdit(b)} disabled={loading}>Bearbeiten</button>
                                    <button onClick={() => handleDelete(b.id)} disabled={loading}>
                                        {loading ? "Wird gelöscht..." : "Löschen"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default BirthdayList;