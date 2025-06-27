import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

function App() {
  const [message, setMessage] = useState('');

  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);


  // --- Fetching Data from Backend ---

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        if (data.length > 0 && !transactionCategory) { 
          setTransactionCategory(data[0].id); 
        }
      } else {
        setMessage('Failed to fetch categories.');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setMessage('Error connecting to backend or fetching categories.');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        setMessage('Failed to fetch transactions.');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setMessage('Error connecting to backend or fetching transactions.');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, []); 


  // --- Category Management Handlers ---

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Category '${data.name}' created!`);
        setCategoryName('');
        fetchCategories(); 
      } else {
        setMessage(data.detail || 'Failed to create category.');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setMessage('Error connecting to backend.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${editingCategory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName }),
        });
        const data = await response.json();
        if (response.ok) {
            setMessage(`Category '${data.name}' updated!`);
            setCategoryName('');
            setEditingCategory(null); 
            fetchCategories();
        } else {
            setMessage(data.detail || 'Failed to update category.');
        }
    } catch (error) {
        console.error('Error updating category:', error);
        setMessage('Error connecting to backend.');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
            method: 'DELETE',
        });
        if (response.ok) { 
            setMessage('Category deleted successfully!');
            fetchCategories();
            fetchTransactions(); 
        } else {
            const data = await response.json();
            setMessage(data.detail || 'Failed to delete category.');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        setMessage('Error connecting to backend.');
    }
  };

  const startEditingCategory = (category) => {
      setEditingCategory(category);
      setCategoryName(category.name);
  };

  const cancelEditingCategory = () => {
      setEditingCategory(null);
      setCategoryName('');
  };


  // --- Transaction Management Handlers ---

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!transactionCategory) {
      setMessage('Please select a category.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(amount), 
          type: type, 
          description: description, 
          category_id: parseInt(transactionCategory) 
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Transaction added!`);
        setAmount('');
        setDescription('');
        fetchTransactions(); 
      } else {
        setMessage(data.detail || 'Failed to add transaction.');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      setMessage('Error connecting to backend.');
    }
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
        const response = await fetch(`${API_BASE_URL}/transactions/${editingTransaction.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: parseFloat(amount),
                type: type,
                description: description,
                category_id: parseInt(transactionCategory),
                transaction_date: editingTransaction.transaction_date 
            }),
        });
        const data = await response.json();
        if (response.ok) {
            setMessage('Transaction updated!');
            setAmount('');
            setDescription('');
            setTransactionCategory('');
            setEditingTransaction(null);
            fetchTransactions();
        } else {
            setMessage(data.detail || 'Failed to update transaction.');
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        setMessage('Error connecting to backend.');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            setMessage('Transaction deleted successfully!');
            fetchTransactions();
        } else {
            const data = await response.json();
            setMessage(data.detail || 'Failed to delete transaction.');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        setMessage('Error connecting to backend.');
    }
  };

  const startEditingTransaction = (transaction) => {
      setEditingTransaction(transaction);
      setAmount(transaction.amount);
      setType(transaction.type);
      setDescription(transaction.description);
      setTransactionCategory(transaction.category_id); 
  };

  const cancelEditingTransaction = () => {
      setEditingTransaction(null);
      setAmount('');
      setDescription('');
      setTransactionCategory('');
  };


  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Personal Finance Tracker</h1>
        {/* Using inline style for message to make it red always */}
        <p style={{ color: 'red', fontSize: '0.9em' }}>{message}</p> 

        <hr />

        <h2>Manage Categories</h2>
        <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}>
          <input
            type="text"
            placeholder="Category Name (e.g., Food, Salary)"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
          <button type="submit">
            {editingCategory ? 'Update Category' : 'Add Category'}
          </button>
          {editingCategory && (
              <button type="button" onClick={cancelEditingCategory}>
                Cancel Edit
              </button>
          )}
        </form>
        <h4>Your Categories:</h4>
        <ul>
          {categories.map(cat => (
            <li key={cat.id}>
              {cat.name}
              <button onClick={() => startEditingCategory(cat)} className="edit-btn">Edit</button>
              <button onClick={() => handleDeleteCategory(cat.id)} className="delete-btn">Delete</button>
            </li>
          ))}
        </ul>
        <p>{categories.length === 0 && "No categories yet. Add some!"}</p>

        <hr />

        <h2>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
        <form onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            step="0.01" 
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <select 
            value={transactionCategory} 
            onChange={(e) => setTransactionCategory(e.target.value)} 
            required
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit">
            {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
          </button>
          {editingTransaction && (
              <button type="button" onClick={cancelEditingTransaction}>
                Cancel Edit
              </button>
          )}
        </form>

        <hr />

        <h2>Your Transactions</h2>
        <ul>
            {transactions.map(t => (
                <li key={t.id}>
                    <strong>Amount:</strong> {t.amount} ({t.type}) <br/>
                    <strong>Category:</strong> {getCategoryName(t.category_id)} <br/>
                    <strong>Date:</strong> {new Date(t.transaction_date).toLocaleDateString()} <br/>
                    <strong>Description:</strong> {t.description || 'N/A'} <br/>
                    <button onClick={() => startEditingTransaction(t)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDeleteTransaction(t.id)} className="delete-btn">Delete</button>
                </li>
            ))}
        </ul>
        <p>{transactions.length === 0 && "No transactions yet. Add some!"}</p>

      </header>
    </div>
  );
}

export default App;