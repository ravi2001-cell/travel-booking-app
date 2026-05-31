const BACKEND_URL = 'http://localhost:5000/api';
let currentCategory = 'flight';

// Load search options on launch
document.addEventListener('DOMContentLoaded', () => {
    loadInventory(currentCategory);
});

function switchCategory(category, buttonElement) {
    // Clear active style states from navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    currentCategory = category;
    loadInventory(category);
}

async function loadInventory(category) {
    const resultsContainer = document.getElementById('resultsEngine');
    resultsContainer.innerHTML = `<p>Scanning active routes for ${category} networks...</p>`;

    try {
        const response = await fetch(`${BACKEND_URL}/search?type=${category}`);
        const routes = await response.json();

        if (routes.length === 0) {
            resultsContainer.innerHTML = `<p>No available ${category} items matching selection.</p>`;
            return;
        }

        resultsContainer.innerHTML = '';
        routes.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ticket-card';
            card.innerHTML = `
                <div>
                    <strong>${item.provider}</strong> (${item.type.toUpperCase()})<br>
                    <small>Route Hub: ${item.origin} ➔ ${item.destination}</small>
                </div>
                <div>
                    <span style="font-size: 1.25rem; font-weight: bold; margin-right: 15px;">$${item.price.toFixed(2)}</span>
                    <button class="book-btn" onclick="executeBooking(${item.id})">Confirm Booking</button>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color: red;">Engine Communication Failure: ${error.message}</p>`;
    }
}

async function executeBooking(inventoryId) {
    const travelerName = prompt("Please input primary passenger string profile for confirmation manifest:");
    if (!travelerName) return;

    try {
        const response = await fetch(`${BACKEND_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inventoryId: inventoryId,
                passengerName: travelerName
            })
        });

        const outcome = await response.json();
        if (response.ok) {
            alert(`Success! Ticket confirmed. Reference Confirmation Ticket ID: #${outcome.bookingId}`);
        } else {
            alert(`Booking processing failed: ${outcome.error}`);
        }
    } catch (error) {
        alert(`Failed to complete booking processing: ${error.message}`);
    }
}
