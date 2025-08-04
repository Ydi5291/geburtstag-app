import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";
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
                console.error("Erreur lors du chargement des anniversaires:", err);
                setError("Erreur lors du chargement des anniversaires");
            } finally {
                setLoading(false);
            }
        };
        fetchBirthdays();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour ajouter un anniversaire");
            return;
        }
        
        // Validation des données
        if (!firstName.trim() || !lastName.trim() || !date) {
            setError("Tous les champs sont obligatoires");
            return;
        }
        
        // Vérifier si l'anniversaire existe déjà
        if (birthdays.some(b => b.firstName.toLowerCase() === firstName.trim().toLowerCase() && 
                              b.lastName.toLowerCase() === lastName.trim().toLowerCase() && 
                              b.date === date)) {
            setError("Cet anniversaire existe déjà !");
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            
            console.log("Tentative d'ajout d'anniversaire:", { firstName: firstName.trim(), lastName: lastName.trim(), date });
            
            // Essayer d'abord sans timeout pour avoir l'erreur exacte
            const docRef = await addDoc(collection(db, "birthdays"), {
                uid: user.uid,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                date
            });
            
            console.log("Anniversaire ajouté avec succès:", docRef.id);
            
            setBirthdays([
                ...birthdays,
                { id: docRef.id, uid: user.uid, firstName: firstName.trim(), lastName: lastName.trim(), date }
            ]);
            setFirstName("");
            setLastName("");
            setDate("");
        } catch (err) {
            console.error("Erreur lors de l'ajout:", err);
            console.error("Code d'erreur:", err.code);
            console.error("Message complet:", err.message);
            
            if (err.code === 'permission-denied') {
                setError(`❌ RÈGLES FIRESTORE INCORRECTES\n\nPour résoudre ce problème:\n1. Allez sur https://console.firebase.google.com/\n2. Sélectionnez votre projet "geburtstag-app"\n3. Dans le menu de gauche, cliquez sur "Firestore Database"\n4. Cliquez sur l'onglet "Rules"\n5. Remplacez le contenu par:\n\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}\n\n6. Cliquez sur "Publier"`);
            } else if (err.code === 'failed-precondition') {
                setError("❌ Créez d'abord une base de données Firestore dans la console Firebase");
            } else if (err.code === 'unavailable') {
                setError("❌ Service Firebase indisponible. Réessayez plus tard.");
            } else {
                setError(`❌ Erreur: ${err.code || 'unknown'} - ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet anniversaire ?")) {
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            
            console.log("Tentative de suppression:", id);
            
            // Ajouter un timeout
            const deletePromise = deleteDoc(doc(db, "birthdays", id));
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout après 10 secondes')), 10000)
            );
            
            await Promise.race([deletePromise, timeoutPromise]);
            
            console.log("Suppression réussie");
            setBirthdays(birthdays.filter(b => b.id !== id));
        } catch (err) {
            console.error("Erreur lors de la suppression:", err);
            if (err.message.includes('Timeout')) {
                setError("L'opération a pris trop de temps. Vérifiez votre connexion internet.");
            } else if (err.code === 'permission-denied') {
                setError("Permission refusée. Vérifiez vos règles Firebase.");
            } else {
                setError(`Erreur lors de la suppression: ${err.message}`);
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
        // Validation des données
        if (!editFirstName.trim() || !editLastName.trim() || !editDate) {
            setError("Tous les champs sont obligatoires");
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            
            console.log("Tentative de mise à jour:", { id, firstName: editFirstName.trim(), lastName: editLastName.trim(), date: editDate });
            
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
            
            console.log("Mise à jour réussie");
            
            setBirthdays(birthdays.map(b =>
                b.id === id ? { ...b, firstName: editFirstName.trim(), lastName: editLastName.trim(), date: editDate } : b
            ));
            // Nettoyer les états d'édition
            setEditId(null);
            setEditFirstName("");
            setEditLastName("");
            setEditDate("");
        } catch (err) {
            console.error("Erreur lors de la mise à jour:", err);
            if (err.message.includes('Timeout')) {
                setError("L'opération a pris trop de temps. Vérifiez votre connexion internet.");
            } else if (err.code === 'permission-denied') {
                setError("Permission refusée. Vérifiez vos règles Firebase.");
            } else {
                setError(`Erreur lors de la mise à jour: ${err.message}`);
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
        setError("Opération annulée");
    };

    return (
        <div className="birthday-list-container">
            <h3>Geburtstage verwalten</h3>
            
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