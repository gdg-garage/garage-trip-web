import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import type { RegistrationInfo, JoiningStatus } from './regisration.types';
import EventRegistrationForm from './EventRegistrationForm';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'https://api.garage-trip.cz';
const EVENT_ID = 'g::t::7.0.0';

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

  const [regisrationInfo, setRegistrationInfo] = useState<RegistrationInfo>({
    joiningStatus: 'awaiting',
    arrivalDate: '',
    departureDate: '',
    childrenCount: 0,
    foodRestrictions: '',
    note: '',
  });
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
            setRegistrationInfo({
              joiningStatus: reg.cancelled ? 'no' : 'yes',
              arrivalDate: reg.arrival_date ? reg.arrival_date.split('T')[0] : '',
              departureDate: reg.departure_date ? reg.departure_date.split('T')[0] : '',
              childrenCount: reg.children_count || 0,
              foodRestrictions: reg.food_restrictions || '',
              note: reg.note || '',
            });
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

  const handleSubmit = useCallback(async (data: RegistrationInfo) => {
    setFormMessage({ text: 'Submitting registration...', type: 'text-info' });

    const {
      joiningStatus,
      arrivalDate,
      departureDate,
      childrenCount,
      foodRestrictions,
      note,
    } = data;

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
        // store the updated registration info in state to update the form immediately
        setRegistrationInfo(data);

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
  }, []);

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

  const { joiningStatus } = regisrationInfo;
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

          <EventRegistrationForm
            initialRegistrationInfo={regisrationInfo}
            onSubmit={handleSubmit}
          />
          {formMessage && (
            <div className={clsx('mt-3 text-center', formMessage.type)}>{formMessage.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}
