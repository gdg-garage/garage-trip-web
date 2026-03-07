import { useState, useEffect } from 'react';
import type { JoiningStatus, RegistrationInfo } from './regisration.types';



interface EventRegistrationFormProps {
  initialRegistrationInfo: RegistrationInfo;
  isNotRegisteredYet: boolean;
  onSubmit: (data: RegistrationInfo) => void;
}

export default function EventRegistrationForm({
  initialRegistrationInfo,
  isNotRegisteredYet,
  onSubmit,
}: EventRegistrationFormProps) {
  const [joiningStatus, setJoiningStatus] = useState<JoiningStatus>(initialRegistrationInfo.joiningStatus);
  const [arrivalDate, setArrivalDate] = useState(initialRegistrationInfo.arrivalDate);
  const [arrivalHour, setArrivalHour] = useState(initialRegistrationInfo.arrivalHour);
  const [departureDate, setDepartureDate] = useState(initialRegistrationInfo.departureDate);
  const [departureHour, setDepartureHour] = useState(initialRegistrationInfo.departureHour);
  const [childrenCount, setChildrenCount] = useState(initialRegistrationInfo.childrenCount);
  const [foodRestrictions, setFoodRestrictions] = useState(initialRegistrationInfo.foodRestrictions);
  const [note, setNote] = useState(initialRegistrationInfo.note);

  // Sync state with props if they change (e.g. after auth/fetch)
  useEffect(() => {
    setJoiningStatus(initialRegistrationInfo.joiningStatus);
    setArrivalDate(initialRegistrationInfo.arrivalDate || '');
    setArrivalHour(initialRegistrationInfo.arrivalHour || '');
    setDepartureDate(initialRegistrationInfo.departureDate || '');
    setDepartureHour(initialRegistrationInfo.departureHour || '');
    setChildrenCount(initialRegistrationInfo.childrenCount);
    setFoodRestrictions(initialRegistrationInfo.foodRestrictions);
    setNote(initialRegistrationInfo.note);
  }, [initialRegistrationInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      joiningStatus: joiningStatus,
      arrivalDate: arrivalDate,
      arrivalHour: arrivalHour,
      departureDate: departureDate,
      departureHour: departureHour,
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
                onChange={() => {
                  setJoiningStatus('yes');
                  setArrivalDate(initialRegistrationInfo.arrivalDate);
                  setArrivalHour(initialRegistrationInfo.arrivalHour);
                  setDepartureDate(initialRegistrationInfo.departureDate);
                  setDepartureHour(initialRegistrationInfo.departureHour);
                }}
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
          <div className="col-12">
            <div className="alert alert-secondary border-secondary bg-dark-subtle mb-0">
              <i className="bi bi-info-circle-fill me-2"></i>
              <strong>Note:</strong> There are no +1s in the form. All adults should register using their own Discord account.
            </div>
          </div>
        )}

        {joiningStatus === 'yes' && (
          <>
            <div className="col-md-4">
              <label htmlFor="arrival_date" className="form-label">
                Arrival Date
              </label>
              <input
                type="date"
                className="form-control bg-dark text-white border-secondary"
                id="arrival_date"
                value={arrivalDate || ''}
                onChange={(e) => setArrivalDate(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label htmlFor="arrival_hour" className="form-label">
                Hour
              </label>
              <input
                type="number"
                className="form-control bg-dark text-white border-secondary"
                id="arrival_hour"
                min="0"
                max="23"
                value={arrivalHour}
                onChange={(e) => setArrivalHour(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="departure_date" className="form-label">
                Departure Date
              </label>
              <input
                type="date"
                className="form-control bg-dark text-white border-secondary"
                id="departure_date"
                value={departureDate || ''}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <label htmlFor="departure_hour" className="form-label">
                Hour
              </label>
              <input
                type="number"
                className="form-control bg-dark text-white border-secondary"
                id="departure_hour"
                min="0"
                max="23"
                value={departureHour}
                onChange={(e) => setDepartureHour(e.target.value)}
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
              <div className="form-text text-warning mt-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                If you're coming as a couple, please have only one parent include the children in their registration to avoid double-counting.
              </div>
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
            placeholder={"e.g. Partner's name: …\nChildren's ages: …"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="form-text text-secondary mt-1">
            Please mention your partner's name and your children's ages if applicable.
          </div>
        </div>

        <div className="col-12 text-center mt-4">
          <button type="submit" className="button purple big w-100">
            <span className="button-icon">
              <img width="24" height="24" src="/assets/svg/icon/icon-event.svg" alt="" />
            </span>
            {isNotRegisteredYet ? 'Submit registration' : 'Update registration'}
          </button>
        </div>
      </div>
    </form>
  );
}
