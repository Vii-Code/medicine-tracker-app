// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import './App.css';

// This is the base URL of our backend API.
const API_URL = 'medicine-tracker-app.railway.internal';

function App() {
  // --- STATE MANAGEMENT ---
  const [medicines, setMedicines] = useState([]);
  const [formInput, setFormInput] = useState({ name: '', totalQuantity: '', dosagePerDay: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Something went wrong! Could not fetch data.');
      }
      const data = await response.json();
      setMedicines(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- EVENT HANDLERS ---
  const handleInputChange = (e) => {
    setFormInput({ ...formInput, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!formInput.name || !formInput.totalQuantity || !formInput.dosagePerDay) {
        alert('Please fill in all fields.');
        return;
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: formInput.name,
            totalQuantity: Number(formInput.totalQuantity),
            dosagePerDay: Number(formInput.dosagePerDay)
        }),
      });
      if (!response.ok) { throw new Error('Failed to add medicine.'); }
      setFormInput({ name: '', totalQuantity: '', dosagePerDay: '' });
      fetchMedicines();
    } catch (err) {
        setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) { throw new Error('Failed to delete medicine.'); }
            fetchMedicines();
        } catch (err) {
            setError(err.message);
        }
    }
  };

  // --- NEW RESTOCK HANDLER ---
  const handleRestock = async (id) => {
    const newQuantityStr = prompt("You've restocked! What is the new total quantity of this medicine?");
    
    if (newQuantityStr) { // If the user didn't click "Cancel"
        const newQuantity = parseInt(newQuantityStr, 10);
        if (!isNaN(newQuantity) && newQuantity > 0) {
            try {
                const response = await fetch(`${API_URL}/${id}/restock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newQuantity }),
                });

                if (!response.ok) {
                    throw new Error('Failed to restock medicine.');
                }
                
                // Refresh the list to show the updated stock and reset status
                fetchMedicines();
                alert('Medicine has been restocked!');

            } catch (err) {
                setError(err.message);
            }
        } else {
            alert("Please enter a valid number greater than 0.");
        }
    }
  };


  // --- RENDER LOGIC ---
  return (
    <div className="App">
      <header className="App-header">
        <h1>Medicine Tracker</h1>
        <p>Your personal pill inventory manager.</p>
      </header>
      
      <main>
        <div className="form-container card">
          <h2>Add New Medicine</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Medicine Name (e.g., Crocin)"
              value={formInput.name}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="totalQuantity"
              placeholder="Total Pills in New Strip"
              value={formInput.totalQuantity}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="dosagePerDay"
              placeholder="Dosage (Pills Per Day)"
              value={formInput.dosagePerDay}
              onChange={handleInputChange}
              required
            />
            <button type="submit">Add Medicine</button>
          </form>
        </div>

        <div className="medicines-container">
          <h2>Your Inventory</h2>
          {isLoading && <p>Loading medicines...</p>}
          {error && <p className="error-message">Error: {error}</p>}
          {!isLoading && !error && medicines.length === 0 && <p>No medicines added yet. Add one above!</p>}
          
          <div className="medicines-list">
            {medicines.map((med) => (
              <div key={med._id} className="card medicine-card">
                <div className="card-content">
                    <h3>{med.name}</h3>
                    <p className={med.daysLeft <= 5 ? 'low-stock' : 'in-stock'}>
                        Stock: {med.currentStock} pills
                    </p>
                    <p>({med.daysLeft} days left)</p>
                </div>
                <div className="card-actions">
                    <button className="restock-btn" onClick={() => handleRestock(med._id)}>Restock</button>
                    <button className="delete-btn" onClick={() => handleDelete(med._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;