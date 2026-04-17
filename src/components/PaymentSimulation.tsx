import React, { useState, useMemo } from 'react';

type Participant = {
  id: number;
  name: string;
  nights: number;
};

const INITIAL_PARTICIPANTS: Participant[] = [
  { id: 1, name: 'Alice (Full time)', nights: 7 },
  { id: 2, name: 'Bob (Full time)', nights: 7 },
  { id: 3, name: 'Charlie (Full time)', nights: 7 },
  { id: 4, name: 'David (Full time)', nights: 7 },
  { id: 5, name: 'Eve (Full time)', nights: 7 },
  { id: 6, name: 'Frank (Full time)', nights: 7 },
  { id: 7, name: 'Grace (Late departure)', nights: 5 },
  { id: 8, name: 'Heidi (Half time)', nights: 3 },
  { id: 9, name: 'Ivan (Weekend only)', nights: 2 },
  { id: 10, name: 'Judy (Just visiting)', nights: 1 },
];

export default function PaymentSimulation() {
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [accommodationCost, setAccommodationCost] = useState(100000);
  const [otherCost, setOtherCost] = useState(50000);

  const totalCost = accommodationCost + otherCost;

  const totalCoefficient = useMemo(() => {
    return participants.reduce((sum, p) => sum + Math.pow(p.nights, 0.6), 0);
  }, [participants]);

  const unitPrice = totalCost / (totalCoefficient || 1);

  const handleNightsChange = (id: number, nights: number) => {
    setParticipants(pts => pts.map(p => p.id === id ? { ...p, nights: Math.max(0, nights) } : p));
  };

  return (
    <div className="payment-simulation mt-4 p-4 border border-secondary rounded bg-dark">
      <h5 className="mb-3 text-white"><i className="bi bi-calculator me-2"></i>Interactive Fair Split Simulation</h5>
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <label className="form-label text-secondary small">Accommodation Cost (CZK)</label>
          <input 
            type="number" 
            className="form-control bg-dark text-white border-secondary" 
            value={accommodationCost} 
            onChange={e => setAccommodationCost(Number(e.target.value))} 
            min="0"
            step="1000"
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label text-secondary small">Other Costs (Food, Drinks, etc.)</label>
          <input 
            type="number" 
            className="form-control bg-dark text-white border-secondary" 
            value={otherCost} 
            onChange={e => setOtherCost(Number(e.target.value))} 
            min="0"
            step="1000"
          />
        </div>
        <div className="col-12 mt-2">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center p-3 text-white border border-secondary rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <span className="mb-2 mb-sm-0"><strong>Total Event Cost:</strong> <span className="fs-5 text-white ms-2">{totalCost.toLocaleString()} CZK</span></span>
            <span><strong>Unit Coefficient:</strong> <span className="text-secondary ms-2">{unitPrice.toFixed(2)} CZK</span></span>
          </div>
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="table custom-table table-dark table-hover mb-0">
          <thead>
            <tr>
              <th className="text-secondary">Participant</th>
              <th className="text-secondary">Nights</th>
              <th className="text-secondary text-end">Coef. (Nights<sup>0.6</sup>)</th>
              <th className="text-secondary text-end">Total Price</th>
              <th className="text-secondary text-end">Per Night</th>
            </tr>
          </thead>
          <tbody>
            {participants.map(p => {
              const coef = Math.pow(p.nights, 0.6);
              const price = coef * unitPrice;
              const pricePerNight = p.nights > 0 ? price / p.nights : 0;
              return (
                <tr key={p.id}>
                  <td className="align-middle text-white">{p.name}</td>
                  <td className="align-middle">
                    <input 
                      type="number" 
                      className="form-control form-control-sm bg-dark text-white border-secondary" 
                      style={{maxWidth: '80px'}} 
                      value={p.nights} 
                      onChange={e => handleNightsChange(p.id, Number(e.target.value))}
                      min="0"
                      max="14"
                    />
                  </td>
                  <td className="align-middle text-end text-secondary">{coef.toFixed(3)}</td>
                  <td className="align-middle text-end fw-bold" style={{ color: '#ae91ff' }}>{Math.round(price).toLocaleString()} CZK</td>
                  <td className="align-middle text-end text-secondary">{Math.round(pricePerNight).toLocaleString()} CZK</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 mb-0 text-secondary" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
        * Feel free to adjust the nights or total costs above to see how the pricing dynamically adapts for everyone. Note how the price per night is much lower for longer stays!
      </p>
    </div>
  );
}
