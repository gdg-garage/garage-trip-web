import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import type { RegistrationInfo, JoiningStatus, RegistrationHistoryItem } from './regisration.types';
import EventRegistrationForm from './EventRegistrationForm';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'https://api.garage-trip.cz';
const EVENT_ID = 'g::t::7.0.0';
const DEFAULT_ARRIVAL_DATE = '2026-09-12';
const DEFAULT_DEPARTURE_DATE = '2026-09-19';
const DEFAULT_ARRIVAL_HOUR = '17';
const DEFAULT_DEPARTURE_HOUR = '10';

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
    arrivalDate: DEFAULT_ARRIVAL_DATE,
    arrivalHour: DEFAULT_ARRIVAL_HOUR,
    departureDate: DEFAULT_DEPARTURE_DATE,
    departureHour: DEFAULT_DEPARTURE_HOUR,
    childrenCount: 0,
    foodRestrictions: '',
    note: '',
  });
  const [formMessage, setFormMessage] = useState<{ text: string; type: string } | null>(null);
  const [errorHtml, setErrorHtml] = useState('');
  const [history, setHistory] = useState<RegistrationHistoryItem[]>([]);

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
              // If they were already registered, use their dates.
              // If they were NOT registered (cancelled), show defaults instead of whatever archival dates might be in DB.
              arrivalDate: (!reg.cancelled && reg.arrival_date) ? reg.arrival_date.split('T')[0] : DEFAULT_ARRIVAL_DATE,
              arrivalHour: (!reg.cancelled && reg.arrival_date) ? new Date(reg.arrival_date).getHours().toString() : DEFAULT_ARRIVAL_HOUR,
              departureDate: (!reg.cancelled && reg.departure_date) ? reg.departure_date.split('T')[0] : DEFAULT_DEPARTURE_DATE,
              departureHour: (!reg.cancelled && reg.departure_date) ? new Date(reg.departure_date).getHours().toString() : DEFAULT_DEPARTURE_HOUR,
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

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/history?event=${EVENT_ID}&diff=false`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  useEffect(() => {
    if (authState === 'authorized') {
      fetchHistory();
    }
  }, [authState, fetchHistory]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleSubmit = useCallback(async (data: RegistrationInfo) => {
    setFormMessage({ text: 'Submitting registration...', type: 'text-info' });

    const {
      joiningStatus,
      arrivalDate,
      arrivalHour,
      departureDate,
      departureHour,
      childrenCount,
      foodRestrictions,
      note,
    } = data;

    const isJoining = joiningStatus === 'yes';

    const parseDateTime = (dateStr: string, hourStr: string, defaultDate: string, defaultHour: string) => {
      const datePart = dateStr || defaultDate;
      const hourPart = hourStr || defaultHour;
      const date = new Date(datePart);
      date.setHours(parseInt(hourPart, 10), 0, 0, 0);
      return date.toISOString();
    };

    const payload = {
      arrival_date: parseDateTime(arrivalDate, arrivalHour, DEFAULT_ARRIVAL_DATE, DEFAULT_ARRIVAL_HOUR),
      departure_date: parseDateTime(departureDate, departureHour, DEFAULT_DEPARTURE_DATE, DEFAULT_DEPARTURE_HOUR),
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
          const meResponse = await fetch(`${API_BASE_URL}/user?event=${EVENT_ID}`, {
            credentials: 'include',
          });
          if (meResponse.ok) {
            const meData: MeData = await meResponse.json();
            setPaid(meData.paid);
          }
        }
        // Refresh history
        fetchHistory();
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
              <a href={`${API_BASE_URL}/auth/discord/login`} className="button blue big" target='_blank'>
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
            isNotRegisteredYet={history.length === 0}
          />
          {formMessage && (
            <div className={clsx('mt-3 text-center', formMessage.type)}>{formMessage.text}</div>
          )}

          {history.length > 0 && (
            <div className="mt-5 pt-4 border-top border-secondary">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Registration History;</h4>
                <div className="text-secondary small">/log</div>
              </div>
              <div className="history-list small">
                {history.map((item, index) => {
                  const prevItem = history[index + 1];
                  const changes = [];

                  if (!prevItem) {
                    changes.push({ label: 'Status', value: item.fields.cancelled ? 'cancelled' : 'initial registration' });
                    if (!item.fields.cancelled) {
                      changes.push({ label: 'Arrival', value: new Date(item.fields.arrival_date!).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }) });
                      changes.push({ label: 'Departure', value: new Date(item.fields.departure_date!).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }) });
                      if (item.fields.children_count) changes.push({ label: 'Children', value: item.fields.children_count });
                      if (item.fields.food_restrictions) changes.push({ label: 'Food', value: item.fields.food_restrictions });
                    }
                  } else {
                    if (item.fields.cancelled !== prevItem.fields.cancelled) {
                      changes.push({
                        label: 'Status',
                        old: prevItem.fields.cancelled ? 'cancelled' : 'active',
                        new: item.fields.cancelled ? 'cancelled' : 'active'
                      });
                    }
                    if (!item.fields.cancelled) {
                      if (item.fields.arrival_date !== prevItem.fields.arrival_date) {
                        changes.push({
                          label: 'Arrival',
                          old: new Date(prevItem.fields.arrival_date!).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }),
                          new: new Date(item.fields.arrival_date!).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
                        });
                      }
                      if (item.fields.departure_date !== prevItem.fields.departure_date) {
                        changes.push({
                          label: 'Departure',
                          old: new Date(prevItem.fields.departure_date!).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }),
                          new: new Date(item.fields.departure_date!).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
                        });
                      }
                      if (item.fields.children_count !== prevItem.fields.children_count) {
                        changes.push({ label: 'Children', old: prevItem.fields.children_count, new: item.fields.children_count });
                      }
                      if (item.fields.food_restrictions !== prevItem.fields.food_restrictions) {
                        changes.push({ label: 'Food', old: prevItem.fields.food_restrictions || 'none', new: item.fields.food_restrictions || 'none' });
                      }
                    }
                    if (item.fields.note !== prevItem.fields.note) {
                      changes.push({ label: 'Note', old: prevItem.fields.note || 'none', new: item.fields.note || 'none' });
                    }
                  }

                  if (changes.length === 0) return null;

                  return (
                    <div key={item.id} className="history-item mb-3 p-3 bg-dark rounded border border-secondary">
                      <div className="d-flex justify-content-between text-secondary mb-2 border-bottom border-secondary pb-1">
                        <span className="monospace">{new Date(item.created_at).toLocaleString('cs-CZ')}</span>
                      </div>
                      <div className="monospace">
                        {changes.map((change, cIdx) => (
                          <div key={cIdx} className="mb-1">
                            <span className="text-secondary">{change.label}:</span>{' '}
                            {change.old !== undefined ? (
                              <>
                                <span className="text-danger text-decoration-line-through me-1">{change.old}</span>
                                <i className="bi bi-arrow-right mx-1 text-secondary"></i>
                                <span className="text-success">{change.new}</span>
                              </>
                            ) : (
                              <span className="text-light">{change.value}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
