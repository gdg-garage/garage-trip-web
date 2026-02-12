import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'https://api.garage-trip.cz';
const EVENT_ID = 'g::t::7.0.0';

type JoiningStatus = 'awaiting' | 'yes' | 'no';

interface Registration {
  event: string;
  cancelled: boolean;
  arrival_date?: string;
  departure_date?: string;
  children_count?: number;
  food_restrictions?: string;
  note?: string;
}

interface MeData {
  username: string;
  paid: boolean;
  registrations?: Registration[];
}

export default function RegisterForm() {
  const [authState, setAuthState] = useState<'loading' | 'unauthorized' | 'authorized'>('loading');
  const [username, setUsername] = useState('');
  const [paid, setPaid] = useState(false);
  const [joiningStatus, setJoiningStatus] = useState<JoiningStatus>('awaiting');
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [childrenCount, setChildrenCount] = useState(0);
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [note, setNote] = useState('');
  const [formMessage, setFormMessage] = useState<{ text: string; type: string } | null>(null);
  const [errorHtml, setErrorHtml] = useState('');

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/me?event=${EVENT_ID}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (response.status === 200) {
        const data: MeData = await response.json();
        setUsername(data.username);
        setPaid(data.paid);
        setAuthState('authorized');

        if (data.registrations && data.registrations.length > 0) {
          const reg = data.registrations.find((r) => r.event === EVENT_ID);
          if (reg) {
            if (reg.cancelled) {
              setJoiningStatus('no');
            } else {
              setJoiningStatus('yes');
              if (reg.arrival_date) setArrivalDate(reg.arrival_date.split('T')[0]);
              if (reg.departure_date) setDepartureDate(reg.departure_date.split('T')[0]);
              setChildrenCount(reg.children_count || 0);
              setFoodRestrictions(reg.food_restrictions || '');
            }
            setNote(reg.note || '');
          }
        }
      } else if (response.status === 401) {
        setAuthState('unauthorized');
      } else {
        throw new Error('Unexpected status: ' + response.status);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setErrorHtml(
        'Something went wrong while checking your authentication status. Please try again later.'
      );
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage({ text: 'Submitting registration...', type: 'text-info' });

    const isJoining = joiningStatus === 'yes';

    const payload = {
      arrival_date: isJoining ? new Date(arrivalDate).toISOString() : new Date().toISOString(),
      departure_date: isJoining ? new Date(departureDate).toISOString() : new Date().toISOString(),
      children_count: isJoining ? childrenCount : 0,
      food_restrictions: isJoining ? foodRestrictions : '',
      cancelled: !isJoining,
      note: note,
      event: EVENT_ID,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormMessage({ text: 'Registration updated successfully!', type: 'text-success' });

        if (isJoining) {
          const meResponse = await fetch(`${API_BASE_URL}/me?event=${EVENT_ID}`, {
            credentials: 'include',
          });
          if (meResponse.ok) {
            const meData: MeData = await meResponse.json();
            setPaid(meData.paid);
          }
        }
      } else {
        const errData = await response.json();
        setFormMessage({
          text: 'Registration failed: ' + (errData.detail || response.statusText),
          type: 'text-danger',
        });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setFormMessage({ text: 'Network error. Please try again.', type: 'text-danger' });
    }
  };

  if (errorHtml) {
    return (
      <div className="row justify-content-center mt-5">
        <div className="col-md-6">
          <div className="box text-danger">
            <h3>Error;</h3>
            <p>{errorHtml}</p>
            <button className="button light mt-3" onClick={() => location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'loading') {
    return (
      <div className="row justify-content-center mt-5">
        <div className="col-md-6 text-center">
          <div className="box">
            <div className="spinner-border text-primary mx-auto mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <div className="row justify-content-center mt-5">
        <div className="col-md-6">
          <div className="box p-5">
            <h3 className="mb-4">Authentication Required;</h3>
            <p className="mb-4">
              You need to be logged in and a member of our{' '}
              <a
                href="https://discord.com/invite/TnaMJMyTDw"
                target="_blank"
                className="secondary-color"
              >
                Discord server
              </a>{' '}
              to register for the event.
            </p>
            <div className="d-flex justify-content-center mt-3">
              <a href={`${API_BASE_URL}/auth/discord/login`} className="button blue big">
                <i className="bi bi-discord"></i> Login via Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // authorized
  const joiningStatusTextMap: Record<JoiningStatus, string> = {
    yes: 'registered;',
    no: 'NOT registered;',
    awaiting: 'awaiting response;',
  };
  const joiningStatusText = joiningStatusTextMap[joiningStatus];
  
  const joiningStatusClass = clsx('monospace ms-2', {
    'text-success': joiningStatus === 'yes',
    'text-danger': joiningStatus === 'no',
    'secondary-color': joiningStatus === 'awaiting',
  });

  return (
    <div className="row mt-4">
      <div className="col-lg-8 offset-lg-2">
        <div className="box">
          <h3>Register for Event 7.0.0;</h3>
          <p>
            Welcome, <span className="secondary-color">{username}</span>!
          </p>

          <div className="mt-4 p-3 border border-secondary rounded bg-dark mb-4">
            <div className="row gy-2">
              <div className="col-12 d-flex justify-content-between">
                <div>
                  <span className="text-secondary">Joining:</span>
                  <span className={joiningStatusClass}>{joiningStatusText}</span>
                </div>
              </div>
              {joiningStatus === 'yes' && (
                <div className="col-12 d-flex justify-content-between">
                  <div>
                    <span className="text-secondary">Payment:</span>
                    <span
                      className={clsx('monospace ms-2', {
                        'text-success': paid,
                        'text-warning': !paid,
                      })}
                    >
                      {paid ? 'paid;' : 'payment pending;'}
                    </span>
                  </div>
                  <a href="/payment" className="secondary-color small">
                    payment info
                  </a>
                </div>
              )}
            </div>
          </div>

          <hr className="my-4 border-secondary" />

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
          {formMessage && (
            <div className={clsx('mt-3 text-center', formMessage.type)}>{formMessage.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}
