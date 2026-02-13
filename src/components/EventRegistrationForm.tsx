import { useState } from 'react';
import type { JoiningStatus, RegistrationInfo } from './regisration.types';



interface EventRegistrationFormProps {
  initialRegistrationInfo: RegistrationInfo;
  onSubmit: (data: RegistrationInfo) => void;
}

export default function EventRegistrationForm({
  initialRegistrationInfo,
  onSubmit,
}: EventRegistrationFormProps) {
  const [joiningStatus, setJoiningStatus] = useState<JoiningStatus>(initialRegistrationInfo.joiningStatus);
  const [arrivalDate, setArrivalDate] = useState(initialRegistrationInfo.arrivalDate);
  const [departureDate, setDepartureDate] = useState(initialRegistrationInfo.departureDate);
  const [childrenCount, setChildrenCount] = useState(initialRegistrationInfo.childrenCount);
  const [foodRestrictions, setFoodRestrictions] = useState(initialRegistrationInfo.foodRestrictions);
  const [note, setNote] = useState(initialRegistrationInfo.note);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      joiningStatus: joiningStatus,
      arrivalDate: arrivalDate,
      departureDate: departureDate,
      childrenCount: childrenCount,
      foodRestrictions: foodRestrictions,
      note: note,
    });
  };

  return (
      <form className="mt-4" onSubmit={handleSubmit}>
        <div className="row gy-4">
          <div className="col-12">
            <label className="form-label d-block mb-3">Are you joining the event?</label>
            <div className="d-flex gap-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="joining_status"
                  id="joining_yes"
                  value="yes"
                  checked={joiningStatus === 'yes'}
                  onChange={() => setJoiningStatus('yes')}
                  required
                />
                <label className="form-check-label text-white" htmlFor="joining_yes">
                  yes
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="joining_status"
                  id="joining_no"
                  value="no"
                  checked={joiningStatus === 'no'}
                  onChange={() => setJoiningStatus('no')}
                  required
                />
                <label className="form-check-label text-white" htmlFor="joining_no">
                  no
                </label>
              </div>
            </div>
          </div>

          {joiningStatus === 'yes' && (
            <>
              <div className="col-md-6">
                <label htmlFor="arrival_date" className="form-label">
                  Arrival Date
                </label>
                <input
                  type="date"
                  className="form-control bg-dark text-white border-secondary"
                  id="arrival_date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="departure_date" className="form-label">
                  Departure Date
                </label>
                <input
                  type="date"
                  className="form-control bg-dark text-white border-secondary"
                  id="departure_date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-12">
                <label htmlFor="children_count" className="form-label">
                  Number of Children
                </label>
                <input
                  type="number"
                  className="form-control bg-dark text-white border-secondary"
                  id="children_count"
                  min={0}
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(parseInt(e.target.value, 10))}
                  required
                />
              </div>
              <div className="col-12">
                <label htmlFor="food_restrictions" className="form-label">
                  Food Restrictions / Allergies
                </label>
                <textarea
                  className="form-control bg-dark text-white border-secondary"
                  id="food_restrictions"
                  rows={3}
                  placeholder="Vegetarian, Gluten-free, etc."
                  value={foodRestrictions}
                  onChange={(e) => setFoodRestrictions(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="col-12">
            <label htmlFor="note" className="form-label">
              Additional Note
            </label>
            <textarea
              className="form-control bg-dark text-white border-secondary"
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="col-12 text-center mt-4">
            <button type="submit" className="button purple big w-100">
              Submit Registration
            </button>
          </div>
        </div>
      </form>
  );
}
