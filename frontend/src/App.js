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
```css
/* frontend/src/App.css */

/* Basic Reset & Body Styling */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f4f7f9;
  color: #333;
}

.App {
  text-align: center;
}

/* Header Styling */
.App-header {
  background-color: #2c3e50;
  padding: 20px;
  color: white;
  border-bottom: 4px solid #3498db;
}

.App-header h1 {
  margin: 0;
  font-size: 2.5rem;
}

/* Main Content Layout */
main {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Card Style for containers */
.card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 25px;
  margin-bottom: 25px;
}

/* Form Styling */
.form-container form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

input[type="text"],
input[type="number"] {
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: border-color 0.2s;
}

input[type="text"]:focus,
input[type="number"]:focus {
  border-color: #3498db;
  outline: none;
}

button {
  padding: 12px 20px;
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  background-color: #3498db;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #2980b9;
}

/* Medicines List Styling */
.medicines-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.medicine-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
}

.medicine-card h3 {
  margin-top: 0;
  color: #2c3e50;
}

.medicine-card p {
    font-size: 1.1rem;
    font-weight: bold;
}

.in-stock {
    color: #27ae60; /* Green */
}

.low-stock {
    color: #e74c3c; /* Red */
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.delete-btn {
  background-color: #e74c3c;
  align-self: flex-end;
  padding: 8px 12px;
  font-size: 0.9rem;
}

.delete-btn:hover {
  background-color: #c0392b;
}

.error-message {
  color: #e74c3c;
  font-weight: bold;
}
