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

const FALLBACK_EVENTS: EventItem[] = [
  {
    id: 1,
    code: 'g::t::7.0.0',
    name: 'Garage Trip 7.0.0',
    start_date: '2026-09-12T17:00:00Z',
    end_date: '2026-09-19T10:00:00Z',
    location: 'Nové Město na Moravě',
    description: 'Seventh edition of the annual GDG Garage coding & gaming retreat.',
    enabled: false,
    status: 'active',
  },
  {
    id: 2,
    code: 'g::t::8.0.0',
    name: 'Garage Trip 8.0.0',
    start_date: '2027-09-11T17:00:00Z',
    end_date: '2027-09-18T10:00:00Z',
    description: 'Upcoming trip. Stay tuned!',
    enabled: false,
    status: 'future',
  },
  {
    id: 3,
    code: 'g::t::6.9',
    name: 'Garage Trip 6.9',
    start_date: '2025-09-20T17:00:00Z',
    end_date: '2025-09-27T10:00:00Z',
    location: 'Nový Svět',
    description: 'Past event archive.',
    enabled: false,
    status: 'past',
  },
];

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
  registrations?: ApiRegistration[];
}

interface OrgRegistrationItem extends ApiRegistration {
  paid: boolean;
  username?: string;
  User?: {
    Username: string;
    DiscordID?: string;
  };
}

export default function UserEventsManager() {
  const [events, setEvents] = useState<EventItem[]>(FALLBACK_EVENTS);
  const [selectedEventCode, setSelectedEventCode] = useState<string>('g::t::7.0.0');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User registration state for the selected event
  const [username, setUsername] = useState('');
  const [userPaid, setUserPaid] = useState(false);
  const [userRegistration, setUserRegistration] = useState<ApiRegistration | null>(null);
  const [userHistory, setUserHistory] = useState<RegistrationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // User edit form state
  const [formJoiningStatus, setFormJoiningStatus] = useState<JoiningStatus>('awaiting');
  const [formArrivalDate, setFormArrivalDate] = useState('2026-09-12');
  const [formArrivalHour, setFormArrivalHour] = useState('17');
  const [formDepartureDate, setFormDepartureDate] = useState('2026-09-19');
  const [formDepartureHour, setFormDepartureHour] = useState('10');
  const [formChildrenCount, setFormChildrenCount] = useState(0);
  const [formFoodRestrictions, setFormFoodRestrictions] = useState('');
  const [formNote, setFormNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Org section state
  const [isOrg, setIsOrg] = useState(false);
  const [orgRegistrations, setOrgRegistrations] = useState<OrgRegistrationItem[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgFilter, setOrgFilter] = useState<'all' | 'joined' | 'cancelled'>('joined');
  const [orgSearch, setOrgSearch] = useState('');
  const [orgActiveTab, setOrgActiveTab] = useState<'attendees' | 'manage_events'>('attendees');

  // Org Create Event form state
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [newEventCode, setNewEventCode] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventStatus, setNewEventStatus] = useState<'future' | 'active' | 'past'>('future');
  const [newEventStartDate, setNewEventStartDate] = useState('');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventEnabled, setNewEventEnabled] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Fetch events list from API
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/events`, {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events from API:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const currentEvent = useMemo(() => {
    const found = events.find((e) => e.code === selectedEventCode);
    if (found) {
      return found;
    }
    return {
      id: 0,
      code: selectedEventCode,
      name: selectedEventCode,
      enabled: false,
      status: 'active',
    };
  }, [events, selectedEventCode]);

  const isEventLocked = !currentEvent.enabled;

  // Load user data for selected event
  const loadUserData = useCallback(async (eventCode: string) => {
    try {
      setLoading(true);
      setError(null);
      setFormMessage(null);

      const response = await fetch(`${PUBLIC_API_BASE_URL}/me?event=${encodeURIComponent(eventCode)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required. Please log in.');
          return;
        }
        throw new Error(`Failed to load profile: ${response.status}`);
      }

      const data: MeResponse = await response.json();
      setUsername(data.username);
      setUserPaid(data.paid);

      if (Array.isArray(data.registrations)) {
        const currentReg = data.registrations.find((r) => r.event === eventCode) || null;
        setUserRegistration(currentReg);

        if (currentReg) {
          let joining: JoiningStatus = 'yes';
          if (currentReg.cancelled) {
            joining = 'no';
          }
          setFormJoiningStatus(joining);

          if (currentReg.arrival_date) {
            const arr = new Date(currentReg.arrival_date);
            setFormArrivalDate(currentReg.arrival_date.split('T')[0]);
            setFormArrivalHour(arr.getHours().toString());
          }

          if (currentReg.departure_date) {
            const dep = new Date(currentReg.departure_date);
            setFormDepartureDate(currentReg.departure_date.split('T')[0]);
            setFormDepartureHour(dep.getHours().toString());
          }

          setFormChildrenCount(currentReg.children_count || 0);
          setFormFoodRestrictions(currentReg.food_restrictions || '');
          setFormNote(currentReg.note || '');
        } else {
          setFormJoiningStatus('awaiting');
          setFormArrivalDate('2026-09-12');
          setFormArrivalHour('17');
          setFormDepartureDate('2026-09-19');
          setFormDepartureHour('10');
          setFormChildrenCount(0);
          setFormFoodRestrictions('');
          setFormNote('');
        }
      }
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Error loading user data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load history for selected event
  const loadHistory = useCallback(async (eventCode: string) => {
    try {
      const response = await fetch(
        `${PUBLIC_API_BASE_URL}/history?event=${encodeURIComponent(eventCode)}&diff=false`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      );
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data.history) ? data.history : [];
        setUserHistory(list);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  // Check org permissions and load org registrations for selected event
  const loadOrgRegistrations = useCallback(async (eventCode: string) => {
    try {
      setOrgLoading(true);
      const response = await fetch(
        `${PUBLIC_API_BASE_URL}/registrations?event=${encodeURIComponent(eventCode)}`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      );

      if (response.status === 200) {
        setIsOrg(true);
        const data = await response.json();
        const raw = Array.isArray(data.registrations) ? data.registrations : [];
        const mapped: OrgRegistrationItem[] = raw.map((r: any) => ({
          ...r,
          username: r.User?.Username || r.username || 'Unknown',
        }));
        setOrgRegistrations(mapped);
      } else if (response.status === 403 || response.status === 401) {
        setIsOrg(false);
        setOrgRegistrations([]);
      }
    } catch (err) {
      console.error('Failed to check org role:', err);
      setIsOrg(false);
      setOrgRegistrations([]);
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData(selectedEventCode);
    loadHistory(selectedEventCode);
    loadOrgRegistrations(selectedEventCode);
  }, [selectedEventCode, loadUserData, loadHistory, loadOrgRegistrations]);

  // Handle user registration submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEventLocked) {
      setFormMessage({
        text: 'This event is locked. Registrations cannot be created or modified.',
        type: 'danger',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage(null);

      const isJoining = formJoiningStatus === 'yes';

      const parseDate = (d: string, h: string) => {
        const dateObj = new Date(d);
        dateObj.setHours(parseInt(h, 10), 0, 0, 0);
        return dateObj.toISOString();
      };

      const childrenCount = isJoining ? formChildrenCount : 0;
      const foodRestrictions = isJoining ? formFoodRestrictions : '';

      const payload = {
        arrival_date: parseDate(formArrivalDate, formArrivalHour),
        departure_date: parseDate(formDepartureDate, formDepartureHour),
        children_count: childrenCount,
        food_restrictions: foodRestrictions,
        cancelled: !isJoining,
        note: formNote,
        event: selectedEventCode,
      };

      const response = await fetch(`${PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormMessage({ text: 'Registration updated successfully!', type: 'success' });
        loadUserData(selectedEventCode);
        loadHistory(selectedEventCode);
        if (isOrg) {
          loadOrgRegistrations(selectedEventCode);
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.detail || errJson?.title || 'Registration submission failed.';
        setFormMessage({ text: errMsg, type: 'danger' });
      }
    } catch (err: any) {
      setFormMessage({ text: err.message || 'Network error occurred.', type: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Org toggle event enable/disable
  const handleToggleEvent = async (eventId: number) => {
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/events/${eventId}/toggle`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        await fetchEvents();
      } else {
        const err = await response.json().catch(() => null);
        alert('Failed to toggle event: ' + (err?.detail || response.statusText));
      }
    } catch (err) {
      console.error('Error toggling event:', err);
      alert('Network error toggling event.');
    }
  };

  // Org create new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventCode.trim() || !newEventName.trim()) {
      setCreateEventError('Event Code and Name are required.');
      return;
    }

    try {
      setIsCreatingEvent(true);
      setCreateEventError(null);

      const payload: any = {
        code: newEventCode.trim(),
        name: newEventName.trim(),
        status: newEventStatus,
        enabled: newEventEnabled,
      };

      if (newEventStartDate) {
        payload.start_date = new Date(newEventStartDate).toISOString();
      }
      if (newEventEndDate) {
        payload.end_date = new Date(newEventEndDate).toISOString();
      }
      if (newEventLocation.trim()) {
        payload.location = newEventLocation.trim();
      }
      if (newEventDescription.trim()) {
        payload.description = newEventDescription.trim();
      }

      const response = await fetch(`${PUBLIC_API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateEventForm(false);
        setNewEventCode('');
        setNewEventName('');
        setNewEventLocation('');
        setNewEventDescription('');
        setNewEventStartDate('');
        setNewEventEndDate('');
        setNewEventEnabled(false);
        await fetchEvents();
      } else {
        const errJson = await response.json().catch(() => null);
        setCreateEventError(errJson?.detail || errJson?.title || 'Failed to create event.');
      }
    } catch (err: any) {
      setCreateEventError(err.message || 'Network error occurred.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Filtered and searched org registrations
  const filteredOrgRegistrations = useMemo(() => {
    let list = orgRegistrations;
    if (orgFilter === 'joined') {
      list = list.filter((r) => !r.cancelled);
    } else if (orgFilter === 'cancelled') {
      list = list.filter((r) => r.cancelled);
    }

    if (orgSearch.trim()) {
      const q = orgSearch.toLowerCase().trim();
      list = list.filter((r) => {
        const u = (r.username || '').toLowerCase();
        const f = (r.food_restrictions || '').toLowerCase();
        const n = (r.note || '').toLowerCase();
        return u.includes(q) || f.includes(q) || n.includes(q);
      });
    }

    return list;
  }, [orgRegistrations, orgFilter, orgSearch]);

  const orgStats = useMemo(() => {
    const joined = orgRegistrations.filter((r) => !r.cancelled);
    const paid = joined.filter((r) => r.paid).length;
    const totalKids = joined.reduce((sum, r) => sum + (r.children_count || 0), 0);
    return {
      total: orgRegistrations.length,
      joined: joined.length,
      cancelled: orgRegistrations.length - joined.length,
      paid,
      kids: totalKids,
    };
  }, [orgRegistrations]);

  // Compute user status label and badge class
  let statusBadgeClass = 'bg-secondary';
  let statusLabel = 'Not Registered';
  if (userRegistration) {
    if (userRegistration.cancelled) {
      statusBadgeClass = 'bg-danger';
      statusLabel = 'Cancelled';
    } else {
      statusBadgeClass = 'bg-success';
      statusLabel = 'Attending';
    }
  }

  let paidBadgeClass = 'bg-warning text-dark';
  let paidLabel = 'Unpaid';
  if (userPaid) {
    paidBadgeClass = 'bg-success';
    paidLabel = 'Paid';
  }

  let emptyOrgTableMessage = 'No registrations found.';
  if (orgLoading) {
    emptyOrgTableMessage = 'Loading registrations...';
  }

  // Format dates helper
  const formatEventDates = (evt: EventItem) => {
    if (evt.start_date && evt.end_date) {
      const s = new Date(evt.start_date).toLocaleDateString('cs-CZ');
      const e = new Date(evt.end_date).toLocaleDateString('cs-CZ');
      return `${s} – ${e}`;
    }
    if (evt.start_date) {
      return new Date(evt.start_date).toLocaleDateString('cs-CZ');
    }
    return 'Dates TBD';
  };

  const renderEventPills = () => (
    <div className="mb-4">
      <label className="text-secondary small text-uppercase fw-bold mb-2 d-block">
        Select Event
      </label>
      <div className="d-flex flex-wrap gap-2">
        {events.map((evt) => {
          const isSelected = evt.code === selectedEventCode;
          let btnClass = 'btn btn-outline-secondary';
          if (isSelected) {
            btnClass = 'btn btn-primary';
          }
          return (
            <button
              key={evt.code}
              type="button"
              className={clsx(btnClass, 'd-flex align-items-center gap-2')}
              onClick={() => setSelectedEventCode(evt.code)}
            >
              <span>{evt.name}</span>
              {!evt.enabled ? (
                <span className="badge bg-dark text-warning border border-warning" title="Registration Closed">
                  <i className="bi bi-lock-fill me-1"></i>locked
                </span>
              ) : (
                <span className="badge bg-success" title="Registration Open">
                  <i className="bi bi-unlock-fill me-1"></i>open
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderEventHeaderCard = () => (
    <div className="box mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h3 className="mb-1">{currentEvent.name};</h3>
          <div className="text-secondary small">
            <i className="bi bi-calendar3 me-2"></i>
            {formatEventDates(currentEvent)}
            {currentEvent.location && (
              <span className="ms-3">
                <i className="bi bi-geo-alt-fill me-1"></i>
                {currentEvent.location}
              </span>
            )}
            <span className="ms-3 badge bg-secondary">{currentEvent.status}</span>
          </div>
        </div>
        <div>
          {isEventLocked ? (
            <span className="badge bg-warning text-dark px-3 py-2 fs-6">
              <i className="bi bi-lock-fill me-1"></i> Locked
            </span>
          ) : (
            <span className="badge bg-success px-3 py-2 fs-6">
              <i className="bi bi-unlock-fill me-1"></i> Open for Registration
            </span>
          )}
        </div>
      </div>

      {currentEvent.description && (
        <p className="text-secondary mb-0">{currentEvent.description}</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="user-events-manager">
        {renderEventPills()}
        {renderEventHeaderCard()}
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading event data...</span>
          </div>
          <p className="mt-3">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-events-manager">
        {renderEventPills()}
        {renderEventHeaderCard()}
        <div className="box text-danger mb-4">
          <h4>error;</h4>
          <p>{error}</p>
          <button
            type="button"
            className="button light mt-2"
            onClick={() => loadUserData(selectedEventCode)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-events-manager">
      {renderEventPills()}
      {renderEventHeaderCard()}

      {/* Section: User's Registration Administration */}
      <div className="box mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h4 className="mb-0">my registration;</h4>
          <div className="d-flex gap-2">
            <span className={clsx('badge px-3 py-2', statusBadgeClass)}>
              {statusLabel}
            </span>
            <span className={clsx('badge px-3 py-2', paidBadgeClass)}>
              {paidLabel}
            </span>
          </div>
        </div>

        {isEventLocked && (
          <div className="alert alert-secondary d-flex align-items-center gap-2 mb-4" role="alert">
            <i className="bi bi-lock-fill text-warning fs-5"></i>
            <div>
              Registration for <strong>{currentEvent.name}</strong> is currently locked.
              Existing registrations are saved and read-only.
            </div>
          </div>
        )}

        {formMessage && (
          <div
            className={clsx(
              'alert mb-4',
              formMessage.type === 'success' ? 'alert-success' : 'alert-danger'
            )}
          >
            {formMessage.text}
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="mb-4">
            <label className="form-label text-secondary small text-uppercase fw-bold mb-2">
              Attendance Status
            </label>
            <div className="d-flex gap-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="joiningStatus"
                  id="statusJoined"
                  value="yes"
                  disabled={isEventLocked}
                  checked={formJoiningStatus === 'yes'}
                  onChange={() => setFormJoiningStatus('yes')}
                />
                <label className="form-check-label text-light" htmlFor="statusJoined">
                  I'm attending
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="joiningStatus"
                  id="statusCancelled"
                  value="no"
                  disabled={isEventLocked}
                  checked={formJoiningStatus === 'no'}
                  onChange={() => setFormJoiningStatus('no')}
                />
                <label className="form-check-label text-light" htmlFor="statusCancelled">
                  I'm not attending (cancelled)
                </label>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Arrival Date
              </label>
              <input
                type="date"
                className="form-control"
                disabled={isEventLocked || formJoiningStatus !== 'yes'}
                value={formArrivalDate}
                onChange={(e) => setFormArrivalDate(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Arrival Hour (0 - 23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                className="form-control"
                disabled={isEventLocked || formJoiningStatus !== 'yes'}
                value={formArrivalHour}
                onChange={(e) => setFormArrivalHour(e.target.value)}
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Departure Date
              </label>
              <input
                type="date"
                className="form-control"
                disabled={isEventLocked || formJoiningStatus !== 'yes'}
                value={formDepartureDate}
                onChange={(e) => setFormDepartureDate(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Departure Hour (0 - 23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                className="form-control"
                disabled={isEventLocked || formJoiningStatus !== 'yes'}
                value={formDepartureHour}
                onChange={(e) => setFormDepartureHour(e.target.value)}
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Children Count
              </label>
              <input
                type="number"
                min="0"
                max="10"
                className="form-control"
                disabled={isEventLocked || formJoiningStatus !== 'yes'}
                value={formChildrenCount}
                onChange={(e) => setFormChildrenCount(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label text-secondary small text-uppercase fw-bold">
                Food Restrictions / Allergies
              </label>
              <input
                type="text"
                className="form-control"
                disabled={isEventLocked || formJoiningStatus !== 'yes'}
                placeholder="Vegetarian, vegan, lactose intolerance, gluten-free, etc."
                value={formFoodRestrictions}
                onChange={(e) => setFormFoodRestrictions(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-secondary small text-uppercase fw-bold">
              Note
            </label>
            <textarea
              className="form-control"
              rows={3}
              disabled={isEventLocked}
              placeholder="Any questions, room preferences, arrival notes..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <button
              type="submit"
              disabled={isEventLocked || isSubmitting}
              className="button purple"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                </>
              ) : (
                'Save Registration'
              )}
            </button>

            {userHistory.length > 0 && (
              <button
                type="button"
                className="button light small"
                onClick={() => setShowHistory(!showHistory)}
              >
                <i className="bi bi-clock-history me-2"></i>
                {showHistory ? 'Hide Change History' : `View Change History (${userHistory.length})`}
              </button>
            )}
          </div>
        </form>

        {/* Registration History Log */}
        {showHistory && userHistory.length > 0 && (
          <div className="mt-4 pt-4 border-top border-secondary">
            <h5 className="mb-3 text-secondary">Registration Changes History;</h5>
            <div className="table-responsive">
              <table className="table table-dark table-sm custom-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Arrival</th>
                    <th>Departure</th>
                    <th>Kids</th>
                    <th>Food</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {userHistory.map((item, idx) => {
                    const isCancelled = item.fields?.cancelled === true;
                    return (
                      <tr key={idx}>
                        <td>{new Date(item.created_at).toLocaleString('cs-CZ')}</td>
                        <td>
                          <span className={clsx('badge', isCancelled ? 'bg-danger' : 'bg-success')}>
                            {isCancelled ? 'Cancelled' : 'Joined'}
                          </span>
                        </td>
                        <td>{item.fields?.arrival_date ? new Date(item.fields.arrival_date).toLocaleString('cs-CZ') : '-'}</td>
                        <td>{item.fields?.departure_date ? new Date(item.fields.departure_date).toLocaleString('cs-CZ') : '-'}</td>
                        <td>{item.fields?.children_count ?? '-'}</td>
                        <td>{item.fields?.food_restrictions || '-'}</td>
                        <td>{item.fields?.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Section: Org Administration (Shown only if the person has the role) */}
      {isOrg && (
        <div className="box mt-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 border-bottom pb-3 border-secondary">
            <div>
              <h4 className="mb-1 text-warning">
                <i className="bi bi-shield-lock-fill me-2"></i>organizer administration;
              </h4>
              <span className="text-secondary small">
                Managing events and attendee registrations
              </span>
            </div>
            <div className="d-flex gap-2">
              <a href="/org/achievements" className="btn btn-sm btn-outline-warning">
                <i className="bi bi-trophy-fill me-1"></i> Org Achievements
              </a>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  fetchEvents();
                  loadOrgRegistrations(selectedEventCode);
                }}
                disabled={orgLoading}
                title="Refresh data"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>

          {/* Org Tab Navigation: Attendees vs Manage Events */}
          <div className="btn-group mb-4">
            <button
              type="button"
              className={clsx('btn btn-sm btn-outline-secondary', orgActiveTab === 'attendees' && 'active')}
              onClick={() => setOrgActiveTab('attendees')}
            >
              <i className="bi bi-people-fill me-2"></i>Attendees ({currentEvent.name})
            </button>
            <button
              type="button"
              className={clsx('btn btn-sm btn-outline-secondary', orgActiveTab === 'manage_events' && 'active')}
              onClick={() => setOrgActiveTab('manage_events')}
            >
              <i className="bi bi-calendar-check-fill me-2"></i>Manage Events ({events.length})
            </button>
          </div>

          {orgActiveTab === 'manage_events' && (
            <div className="events-administration mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 text-light">Events Administration;</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowCreateEventForm(!showCreateEventForm)}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  {showCreateEventForm ? 'Cancel' : 'Create Event'}
                </button>
              </div>

              {/* Create Event Form */}
              {showCreateEventForm && (
                <div className="p-4 border border-secondary rounded bg-dark mb-4">
                  <h6 className="mb-3 text-warning">Create New Event;</h6>

                  {createEventError && (
                    <div className="alert alert-danger py-2">{createEventError}</div>
                  )}

                  <form onSubmit={handleCreateEvent}>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-bold">Code / Identifier</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. g::t::8.0.0"
                          value={newEventCode}
                          onChange={(e) => setNewEventCode(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-bold">Event Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Garage Trip 8.0.0"
                          value={newEventName}
                          onChange={(e) => setNewEventName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label text-secondary small fw-bold">Status</label>
                        <select
                          className="form-select form-select-sm"
                          value={newEventStatus}
                          onChange={(e: any) => setNewEventStatus(e.target.value)}
                        >
                          <option value="future">future</option>
                          <option value="active">active</option>
                          <option value="past">past</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-secondary small fw-bold">Start Date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={newEventStartDate}
                          onChange={(e) => setNewEventStartDate(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-secondary small fw-bold">End Date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={newEventEndDate}
                          onChange={(e) => setNewEventEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-bold">Location</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Nové Město na Moravě"
                          value={newEventLocation}
                          onChange={(e) => setNewEventLocation(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-secondary small fw-bold">Description</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Optional notes or details"
                          value={newEventDescription}
                          onChange={(e) => setNewEventDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="newEventEnabledCheck"
                        checked={newEventEnabled}
                        onChange={(e) => setNewEventEnabled(e.target.checked)}
                      />
                      <label className="form-check-label text-light small" htmlFor="newEventEnabledCheck">
                        Enable registration immediately (open)
                      </label>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        className="btn btn-sm btn-success"
                        disabled={isCreatingEvent}
                      >
                        {isCreatingEvent ? 'Creating...' : 'Create Event'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setShowCreateEventForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Events Table */}
              <div className="table-responsive">
                <table className="table table-dark table-hover table-striped custom-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Dates</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Registration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt) => {
                      let statusBadge = 'bg-secondary';
                      if (evt.status === 'active') {
                        statusBadge = 'bg-primary';
                      } else if (evt.status === 'future') {
                        statusBadge = 'bg-info text-dark';
                      }

                      return (
                        <tr key={evt.code}>
                          <td className="monospace fw-bold">{evt.code}</td>
                          <td>{evt.name}</td>
                          <td>{formatEventDates(evt)}</td>
                          <td>{evt.location || '-'}</td>
                          <td>
                            <span className={clsx('badge', statusBadge)}>
                              {evt.status}
                            </span>
                          </td>
                          <td>
                            {evt.enabled ? (
                              <span className="badge bg-success">
                                <i className="bi bi-unlock-fill me-1"></i>Enabled
                              </span>
                            ) : (
                              <span className="badge bg-danger">
                                <i className="bi bi-lock-fill me-1"></i>Disabled
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={clsx(
                                'btn btn-sm',
                                evt.enabled ? 'btn-outline-warning' : 'btn-outline-success'
                              )}
                              onClick={() => handleToggleEvent(evt.id)}
                            >
                              {evt.enabled ? (
                                <>
                                  <i className="bi bi-lock me-1"></i>Disable
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-unlock me-1"></i>Enable
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {orgActiveTab === 'attendees' && (
            <>
              {/* Stats Overview */}
              <div className="row mb-4 gy-3">
                <div className="col-6 col-md-3">
                  <div className="box text-center p-3 h-100 bg-dark">
                    <span className="text-secondary small">JOINED</span>
                    <h2 className="mb-0 text-success">{orgStats.joined}</h2>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="box text-center p-3 h-100 bg-dark">
                    <span className="text-secondary small">PAID</span>
                    <h2 className="mb-0 text-primary">{orgStats.paid}</h2>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="box text-center p-3 h-100 bg-dark">
                    <span className="text-secondary small">KIDS</span>
                    <h2 className="mb-0 text-info">{orgStats.kids}</h2>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="box text-center p-3 h-100 bg-dark">
                    <span className="text-secondary small">CANCELLED</span>
                    <h2 className="mb-0 text-danger">{orgStats.cancelled}</h2>
                  </div>
                </div>
              </div>

              {/* Filter and Search Controls */}
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
                <div className="btn-group">
                  <button
                    type="button"
                    className={clsx('btn btn-sm btn-outline-secondary', orgFilter === 'joined' && 'active')}
                    onClick={() => setOrgFilter('joined')}
                  >
                    Joined ({orgStats.joined})
                  </button>
                  <button
                    type="button"
                    className={clsx('btn btn-sm btn-outline-secondary', orgFilter === 'cancelled' && 'active')}
                    onClick={() => setOrgFilter('cancelled')}
                  >
                    Cancelled ({orgStats.cancelled})
                  </button>
                  <button
                    type="button"
                    className={clsx('btn btn-sm btn-outline-secondary', orgFilter === 'all' && 'active')}
                    onClick={() => setOrgFilter('all')}
                  >
                    All ({orgStats.total})
                  </button>
                </div>

                <div className="input-group" style={{ maxWidth: '300px' }}>
                  <span className="input-group-text bg-dark text-secondary border-secondary">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-light border-secondary"
                    placeholder="Search attendee..."
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Registrations Table */}
              <div className="table-responsive">
                <table className="table table-dark table-hover table-striped custom-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Paid</th>
                      <th>Arrival</th>
                      <th>Departure</th>
                      <th>Kids</th>
                      <th>Food</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-4 text-secondary">
                          {emptyOrgTableMessage}
                        </td>
                      </tr>
                    ) : (
                      filteredOrgRegistrations.map((reg, idx) => (
                        <tr key={idx} className={clsx({ 'opacity-50': reg.cancelled })}>
                          <td>{reg.username}</td>
                          <td>
                            <span className={clsx('badge', reg.cancelled ? 'bg-danger' : 'bg-success')}>
                              {reg.cancelled ? 'Cancelled' : 'Joined'}
                            </span>
                          </td>
                          <td>
                            <i
                              className={clsx(
                                'bi',
                                reg.paid ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-warning'
                              )}
                              title={reg.paid ? 'Paid' : 'Unpaid'}
                            ></i>
                          </td>
                          <td>
                            {reg.arrival_date
                              ? new Date(reg.arrival_date).toLocaleString('cs-CZ', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '-'}
                          </td>
                          <td>
                            {reg.departure_date
                              ? new Date(reg.departure_date).toLocaleString('cs-CZ', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '-'}
                          </td>
                          <td>{reg.children_count || 0}</td>
                          <td
                            className="small text-truncate"
                            style={{ maxWidth: '150px' }}
                            title={reg.food_restrictions}
                          >
                            {reg.food_restrictions || '-'}
                          </td>
                          <td
                            className="small text-truncate"
                            style={{ maxWidth: '200px' }}
                            title={reg.note}
                          >
                            {reg.note || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
