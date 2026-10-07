import { useState, useEffect, useCallback, useMemo } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';
import clsx from 'clsx';
import type { JoiningStatus, RegistrationHistoryItem } from '../regisration.types';

export interface EventItem {
  id: number;
  code: string;
  name: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
  enabled: boolean;
  status: 'active' | 'future' | 'past' | string;
}

interface ApiRegistration {
  id?: number;
  event: string;
  cancelled: boolean;
  arrival_date?: string;
  departure_date?: string;
  children_count?: number;
  food_restrictions?: string;
  note?: string;
}

interface MeResponse {
  username: string;
  email?: string;
  paid: boolean;
  is_org?: boolean;
  registrations?: ApiRegistration[];
}

export default function UserEventsManager() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User info & all registrations from /me
  const [username, setUsername] = useState('');
  const [allUserRegistrations, setAllUserRegistrations] = useState<ApiRegistration[]>([]);

  // Selected event data
  const [userPaid, setUserPaid] = useState(false);
  const [userRegistration, setUserRegistration] = useState<ApiRegistration | null>(null);
  const [userHistory, setUserHistory] = useState<RegistrationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // User edit form state
  const [formJoiningStatus, setFormJoiningStatus] = useState<JoiningStatus>('awaiting');
  const [formArrivalDate, setFormArrivalDate] = useState('');
  const [formArrivalHour, setFormArrivalHour] = useState('17');
  const [formDepartureDate, setFormDepartureDate] = useState('');
  const [formDepartureHour, setFormDepartureHour] = useState('10');
  const [formChildrenCount, setFormChildrenCount] = useState(0);
  const [formFoodRestrictions, setFormFoodRestrictions] = useState('');
  const [formNote, setFormNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Map of registrations by event code
  const registrationByEvent = useMemo(() => {
    const map = new Map<string, ApiRegistration>();
    for (const reg of allUserRegistrations) {
      map.set(reg.event, reg);
    }
    return map;
  }, [allUserRegistrations]);

  // Fetch events list and user registrations
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch user data
      const meRes = await fetch(`${PUBLIC_API_BASE_URL}/me`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (meRes.ok) {
        const meData: MeResponse = await meRes.json();
        setUsername(meData.username || '');
        const regs = Array.isArray(meData.registrations) ? meData.registrations : [];
        setAllUserRegistrations(regs);
      }

      // 2. Fetch visible events (credentials included so server includes past registered events)
      const evRes = await fetch(`${PUBLIC_API_BASE_URL}/events`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (evRes.ok) {
        const data = await evRes.json();
        const evList: EventItem[] = Array.isArray(data.events) ? data.events : [];
        setEvents(evList);
      }
    } catch (err: any) {
      console.error('Failed to load events/user data:', err);
      setError('Unable to load events data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Selected event object
  const currentEvent = useMemo(() => {
    if (!selectedEventCode) return null;
    return events.find((e) => e.code === selectedEventCode) || null;
  }, [events, selectedEventCode]);

  // Load registration & history for selected event
  const loadSelectedEventDetails = useCallback(async (eventCode: string) => {
    try {
      const ev = events.find((e) => e.code === eventCode);

      // Default dates from event or fallbacks
      let defaultArr = '2026-09-12';
      let defaultDep = '2026-09-19';
      if (ev?.start_date) {
        defaultArr = ev.start_date.substring(0, 10);
      }
      if (ev?.end_date) {
        defaultDep = ev.end_date.substring(0, 10);
      }

      const response = await fetch(
        `${PUBLIC_API_BASE_URL}/me?event=${encodeURIComponent(eventCode)}`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      );

      if (response.status === 200) {
        const data: MeResponse = await response.json();
        setUsername(data.username || '');
        setUserPaid(data.paid || false);

        const regs = Array.isArray(data.registrations) ? data.registrations : [];
        const found = regs.find((r) => r.event === eventCode) || null;
        setUserRegistration(found);

        if (found) {
          if (found.cancelled) {
            setFormJoiningStatus('no');
          } else {
            setFormJoiningStatus('yes');
          }

          if (found.arrival_date) {
            const arr = new Date(found.arrival_date);
            setFormArrivalDate(arr.toISOString().substring(0, 10));
            setFormArrivalHour(String(arr.getUTCHours()));
          } else {
            setFormArrivalDate(defaultArr);
            setFormArrivalHour('17');
          }

          if (found.departure_date) {
            const dep = new Date(found.departure_date);
            setFormDepartureDate(dep.toISOString().substring(0, 10));
            setFormDepartureHour(String(dep.getUTCHours()));
          } else {
            setFormDepartureDate(defaultDep);
            setFormDepartureHour('10');
          }

          setFormChildrenCount(found.children_count || 0);
          setFormFoodRestrictions(found.food_restrictions || '');
          setFormNote(found.note || '');
        } else {
          setFormJoiningStatus('awaiting');
          setFormArrivalDate(defaultArr);
          setFormArrivalHour('17');
          setFormDepartureDate(defaultDep);
          setFormDepartureHour('10');
          setFormChildrenCount(0);
          setFormFoodRestrictions('');
          setFormNote('');
        }
      }

      // Fetch history
      const histRes = await fetch(
        `${PUBLIC_API_BASE_URL}/history?event=${encodeURIComponent(eventCode)}`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      );
      if (histRes.ok) {
        const histData = await histRes.json();
        setUserHistory(Array.isArray(histData.history) ? histData.history : []);
      }
    } catch (err) {
      console.error('Failed to load selected event details:', err);
    }
  }, [events]);

  useEffect(() => {
    if (selectedEventCode) {
      loadSelectedEventDetails(selectedEventCode);
      setFormMessage(null);
    }
  }, [selectedEventCode, loadSelectedEventDetails]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;

    if (!currentEvent.enabled) {
      setFormMessage({
        text: 'Registration for this event is closed.',
        type: 'danger',
      });
      return;
    }

    if (formJoiningStatus === 'awaiting') {
      setFormMessage({
        text: 'Please choose whether you will attend (Yes or No).',
        type: 'danger',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage(null);

      const isCancelled = formJoiningStatus === 'no';
      const arrIso = new Date(
        `${formArrivalDate}T${formArrivalHour.padStart(2, '0')}:00:00Z`
      ).toISOString();
      const depIso = new Date(
        `${formDepartureDate}T${formDepartureHour.padStart(2, '0')}:00:00Z`
      ).toISOString();

      const payload = {
        event: currentEvent.code,
        cancelled: isCancelled,
        arrival_date: arrIso,
        departure_date: depIso,
        children_count: Number(formChildrenCount),
        food_restrictions: formFoodRestrictions.trim(),
        note: formNote.trim(),
      };

      const res = await fetch(`${PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormMessage({
          text: 'Registration successfully updated!',
          type: 'success',
        });
        await loadSelectedEventDetails(currentEvent.code);
        // Refresh all user registrations
        const meRes = await fetch(`${PUBLIC_API_BASE_URL}/me`, {
          credentials: 'include',
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setAllUserRegistrations(meData.registrations || []);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setFormMessage({
          text: data.detail || 'Failed to update registration.',
          type: 'danger',
        });
      }
    } catch (err: any) {
      setFormMessage({
        text: err.message || 'Network error occurred.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick cancel
  const handleCancelRegistration = async () => {
    if (!currentEvent) return;
    if (!confirm('Are you sure you want to cancel your registration?')) return;

    try {
      setIsSubmitting(true);
      const payload = {
        event: currentEvent.code,
        cancelled: true,
      };
      const res = await fetch(`${PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setFormMessage({
          text: 'Your registration has been cancelled.',
          type: 'success',
        });
        setFormJoiningStatus('no');
        await loadSelectedEventDetails(currentEvent.code);
      }
    } catch (err: any) {
      setFormMessage({ text: err.message, type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading events...</span>
        </div>
        <p className="mt-3 text-secondary">Loading your events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger p-4 text-center">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
      </div>
    );
  }

  // VIEW 1: Vertical Event Selector List (when no event is currently chosen)
  if (!selectedEventCode || !currentEvent) {
    return (
      <div className="user-events-list">
        <div className="mb-4">
          <h3 className="mb-1">Events;</h3>
          <p className="text-secondary small mb-0">
            Select an event to view details or manage your registration.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="box p-5 text-center">
            <i className="bi bi-calendar-x display-4 text-secondary mb-3 d-block"></i>
            <h4>No Events Available</h4>
            <p className="text-secondary mb-0">
              There are currently no events open for registration. Check back soon!
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {events.map((ev) => {
              const reg = registrationByEvent.get(ev.code);

              let statusBadgeClass = 'bg-secondary';
              if (ev.status === 'active') statusBadgeClass = 'bg-success';
              if (ev.status === 'future') statusBadgeClass = 'bg-info text-dark';
              if (ev.status === 'past') statusBadgeClass = 'bg-dark text-secondary border border-secondary';

              let regBadge = <span className="badge bg-secondary">Not registered</span>;
              let actionText = 'Register →';
              if (reg) {
                if (reg.cancelled) {
                  regBadge = <span className="badge bg-danger">Cancelled</span>;
                  actionText = 'View Registration →';
                } else {
                  regBadge = <span className="badge bg-success">Registered</span>;
                  actionText = 'Manage Registration →';
                }
              } else if (!ev.enabled) {
                actionText = 'View Event →';
              }

              let datesString = 'Dates to be announced';
              if (ev.start_date && ev.end_date) {
                const s = new Date(ev.start_date).toLocaleDateString();
                const e = new Date(ev.end_date).toLocaleDateString();
                datesString = `${s} – ${e}`;
              }

              return (
                <div
                  key={ev.code}
                  className="box p-4 border border-secondary border-opacity-25"
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                  }}
                  onClick={() => setSelectedEventCode(ev.code)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(88, 101, 242, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(108, 117, 125, 0.25)';
                  }}
                >
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <h4 className="mb-1 text-white">{ev.name};</h4>
                      <div className="text-secondary small d-flex flex-wrap align-items-center gap-3">
                        <span>
                          <i className="bi bi-calendar3 me-1"></i>
                          {datesString}
                        </span>
                        {ev.location && (
                          <span>
                            <i className="bi bi-geo-alt-fill me-1"></i>
                            {ev.location}
                          </span>
                        )}
                        <span className={clsx('badge', statusBadgeClass)}>{ev.status}</span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {regBadge}
                      {!ev.enabled && (
                        <span className="badge bg-dark text-warning border border-warning">
                          <i className="bi bi-lock-fill me-1"></i>closed
                        </span>
                      )}
                    </div>
                  </div>

                  {ev.description && (
                    <p className="text-secondary small mb-3">{ev.description}</p>
                  )}

                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventCode(ev.code);
                      }}
                    >
                      {actionText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // VIEW 2: Selected Event Details & Registration Management
  let statusBadgeClass = 'bg-secondary';
  if (currentEvent.status === 'active') statusBadgeClass = 'bg-success';
  if (currentEvent.status === 'future') statusBadgeClass = 'bg-info text-dark';
  if (currentEvent.status === 'past') statusBadgeClass = 'bg-dark text-secondary';

  let eventDates = 'Dates to be announced';
  if (currentEvent.start_date && currentEvent.end_date) {
    const s = new Date(currentEvent.start_date).toLocaleDateString();
    const e = new Date(currentEvent.end_date).toLocaleDateString();
    eventDates = `${s} – ${e}`;
  }

  let registrationStatusNode = <span className="text-secondary">Not registered yet</span>;
  if (userRegistration) {
    if (userRegistration.cancelled) {
      registrationStatusNode = (
        <span className="text-danger fw-bold">
          <i className="bi bi-x-circle-fill me-1"></i>Cancelled
        </span>
      );
    } else {
      registrationStatusNode = (
        <span className="text-success fw-bold">
          <i className="bi bi-check-circle-fill me-1"></i>Registered
        </span>
      );
    }
  }

  return (
    <div className="user-event-details">
      {/* Back Button */}
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          onClick={() => setSelectedEventCode(null)}
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back to events list</span>
        </button>
      </div>

      {/* Event Header Banner */}
      <div className="box mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h3 className="mb-1">{currentEvent.name};</h3>
            <div className="text-secondary small d-flex flex-wrap align-items-center gap-3">
              <span>
                <i className="bi bi-calendar3 me-1"></i>
                {eventDates}
              </span>
              {currentEvent.location && (
                <span>
                  <i className="bi bi-geo-alt-fill me-1"></i>
                  {currentEvent.location}
                </span>
              )}
              <span className={clsx('badge', statusBadgeClass)}>{currentEvent.status}</span>
            </div>
          </div>
          <div>
            {currentEvent.enabled ? (
              <span className="badge bg-success px-3 py-2 fs-6">
                <i className="bi bi-unlock-fill me-1"></i> Open
              </span>
            ) : (
              <span className="badge bg-warning text-dark px-3 py-2 fs-6">
                <i className="bi bi-lock-fill me-1"></i> Locked
              </span>
            )}
          </div>
        </div>
        {currentEvent.description && (
          <p className="text-secondary mb-0">{currentEvent.description}</p>
        )}
      </div>

      {/* Registration Locked Banner */}
      {!currentEvent.enabled && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-4">
          <i className="bi bi-lock-fill fs-4"></i>
          <div>
            <strong>Registration is currently closed for this event.</strong>
            <div className="small">
              {currentEvent.status === 'past'
                ? 'This event has concluded. You are viewing your historical registration summary.'
                : 'Registration has not opened yet or is currently locked by organizers.'}
            </div>
          </div>
        </div>
      )}

      {/* Registration Status Card */}
      <div className="box mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">
            <i className="bi bi-person-badge-fill me-2"></i>your registration status;
          </h4>
          {userHistory.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowHistory(!showHistory)}
            >
              <i className="bi bi-clock-history me-1"></i>
              {showHistory ? 'Hide history' : `History (${userHistory.length})`}
            </button>
          )}
        </div>

        <div className="row g-3">
          <div className="col-md-4">
            <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
              <div className="text-secondary small text-uppercase fw-bold">Registration</div>
              <div className="fs-5 mt-1">
                {registrationStatusNode}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
              <div className="text-secondary small text-uppercase fw-bold">Payment</div>
              <div className="fs-5 mt-1">
                {userPaid ? (
                  <span className="text-success fw-bold">
                    <i className="bi bi-check2-circle me-1"></i>Paid
                  </span>
                ) : (
                  <span className="text-warning">
                    <i className="bi bi-clock me-1"></i>Awaiting / Unpaid
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
              <div className="text-secondary small text-uppercase fw-bold">Children</div>
              <div className="fs-5 mt-1 text-white">
                {userRegistration ? userRegistration.children_count || 0 : 0}
              </div>
            </div>
          </div>
        </div>

        {/* History Log */}
        {showHistory && userHistory.length > 0 && (
          <div className="mt-4 pt-3 border-top border-secondary border-opacity-25">
            <h6 className="text-secondary text-uppercase fw-bold mb-3">Audit Log</h6>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {userHistory.map((h, i) => (
                    <tr key={h.id || i}>
                      <td className="small text-secondary">
                        {h.CreatedAt ? new Date(h.CreatedAt).toLocaleString() : '-'}
                      </td>
                      <td>{h.Username || username}</td>
                      <td>
                        {h.cancelled ? (
                          <span className="badge bg-danger">Cancelled</span>
                        ) : (
                          <span className="badge bg-success">Active</span>
                        )}
                      </td>
                      <td className="small text-secondary">
                        {h.arrival_date ? new Date(h.arrival_date).toLocaleDateString() : '-'} &rarr;{' '}
                        {h.departure_date ? new Date(h.departure_date).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Registration Form (Only active when event is enabled) */}
      {currentEvent.enabled && (
        <div className="box mb-4">
          <h4 className="mb-3">
            <i className="bi bi-pencil-square me-2"></i>manage registration;
          </h4>

          {formMessage && (
            <div className={clsx('alert py-2 mb-3', `alert-${formMessage.type}`)}>
              {formMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Are you attending? *
              </label>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={clsx(
                    'btn px-4',
                    formJoiningStatus === 'yes' ? 'btn-success' : 'btn-outline-secondary'
                  )}
                  onClick={() => setFormJoiningStatus('yes')}
                >
                  <i className="bi bi-check-lg me-1"></i>Yes, I am going
                </button>
                <button
                  type="button"
                  className={clsx(
                    'btn px-4',
                    formJoiningStatus === 'no' ? 'btn-danger' : 'btn-outline-secondary'
                  )}
                  onClick={() => setFormJoiningStatus('no')}
                >
                  <i className="bi bi-x-lg me-1"></i>No, cannot attend
                </button>
              </div>
            </div>

            {formJoiningStatus === 'yes' && (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small text-secondary">Arrival Date & Hour</label>
                    <div className="input-group">
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={formArrivalDate}
                        onChange={(e) => setFormArrivalDate(e.target.value)}
                        required
                      />
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        style={{ maxWidth: '100px' }}
                        value={formArrivalHour}
                        onChange={(e) => setFormArrivalHour(e.target.value)}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={String(i)}>
                            {String(i).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small text-secondary">Departure Date & Hour</label>
                    <div className="input-group">
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={formDepartureDate}
                        onChange={(e) => setFormDepartureDate(e.target.value)}
                        required
                      />
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        style={{ maxWidth: '100px' }}
                        value={formDepartureHour}
                        onChange={(e) => setFormDepartureHour(e.target.value)}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={String(i)}>
                            {String(i).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-secondary">Accompanying Children</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="form-control bg-dark text-white border-secondary"
                    style={{ maxWidth: '150px' }}
                    value={formChildrenCount}
                    onChange={(e) => setFormChildrenCount(Number(e.target.value))}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small text-secondary">Dietary Restrictions</label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Vegetarian, vegan, allergies..."
                    value={formFoodRestrictions}
                    onChange={(e) => setFormFoodRestrictions(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small text-secondary">Note / Additional Info</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows={2}
                    placeholder="Anything else organizers should know..."
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  ></textarea>
                </div>
              </>
            )}

            <div className="d-flex justify-content-between align-items-center">
              <div>
                {userRegistration && !userRegistration.cancelled && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleCancelRegistration}
                    disabled={isSubmitting}
                  >
                    Cancel Registration
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={isSubmitting || formJoiningStatus === 'awaiting'}
              >
                {isSubmitting ? 'Saving...' : 'Save Registration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
