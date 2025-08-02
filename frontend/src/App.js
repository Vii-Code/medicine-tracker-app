// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import './App.css';

// This is the base URL of our backend API.
const API_URL = 'http://localhost:5000/api/medicines';

function App() {
  // --- STATE MANAGEMENT ---
  // 'medicines' will hold the list of medicines fetched from the backend.
  const [medicines, setMedicines] = useState([]);
  // 'formInput' will hold the data from the 'Add Medicine' form.
  const [formInput, setFormInput] = useState({ name: '', totalQuantity: '', dosagePerDay: '' });
  // 'isLoading' will be true while we are fetching data.
  const [isLoading, setIsLoading] = useState(true);
  // 'error' will hold any error messages.
  const [error, setError] = useState(null);

  // --- DATA FETCHING ---
  // useEffect is a React hook that runs after the component renders.
  // The empty array [] at the end means it will only run ONCE, when the component first loads.
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
    // Update the formInput state as the user types.
    // e.target.name will be 'name', 'totalQuantity', or 'dosagePerDay'
    // e.target.value will be what the user typed.
    setFormInput({ ...formInput, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the webpage from reloading on form submission.

    // Basic validation
    if (!formInput.name || !formInput.totalQuantity || !formInput.dosagePerDay) {
        alert('Please fill in all fields.');
        return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: formInput.name,
            totalQuantity: Number(formInput.totalQuantity),
            dosagePerDay: Number(formInput.dosagePerDay)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add medicine.');
      }

      // Clear the form and fetch the updated list of medicines
      setFormInput({ name: '', totalQuantity: '', dosagePerDay: '' });
      fetchMedicines();

    } catch (err) {
        setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    // Ask for confirmation before deleting
    if (window.confirm('Are you sure you want to delete this medicine?')) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete medicine.');
            }
            
            // Refresh the list after deleting
            fetchMedicines();

        } catch (err) {
            setError(err.message);
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
                <h3>{med.name}</h3>
                <p className={med.daysLeft <= 5 ? 'low-stock' : 'in-stock'}>
                    Stock: {med.currentStock} pills
                </p>
                <p>({med.daysLeft} days left)</p>
                <button className="delete-btn" onClick={() => handleDelete(med._id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
