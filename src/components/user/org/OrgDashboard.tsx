import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';
import clsx from 'clsx';
import CreateAchievementForm from '../../org/CreateAchievementForm';
import OrgAchievementsList from '../../org/OrgAchievementsList';

interface EventItem {
  id: number;
  code: string;
  name: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
  enabled: boolean;
  status: 'future' | 'past' | string;
  created_at: string;
  updated_at: string;
}

interface RegistrationItem {
  id?: number;
  username: string;
  paid: boolean;
  event: string;
  cancelled: boolean;
  arrival_date: string;
  departure_date: string;
  children_count: number;
  food_restrictions: string;
  note: string;
}

type OrgSubmenu = 'events' | 'overview' | 'achievements';

export default function OrgDashboard() {
  const [activeSubmenu, setActiveSubmenu] = useState<OrgSubmenu>('events');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // All events list (for events admin and event overview selector)
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Selected event for event overview
  const [selectedOverviewEventCode, setSelectedOverviewEventCode] = useState<string>('');

  // Overview registrations
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regFilter, setRegFilter] = useState<'all' | 'joined' | 'cancelled'>('joined');
  const [regSearch, setRegSearch] = useState('');

  // Create event modal/form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createStatus, setCreateStatus] = useState<'future' | 'past'>('future');
  const [createEnabled, setCreateEnabled] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit event modal/form
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'future' | 'past'>('future');
  const [editEnabled, setEditEnabled] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toggle loading
  const [togglingEventId, setTogglingEventId] = useState<number | null>(null);

  // Read URL query params on mount to support ?tab=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'events' || tabParam === 'overview' || tabParam === 'achievements') {
      setActiveSubmenu(tabParam);
    }
  }, []);

  // Update URL query param when submenu changes
  const switchSubmenu = (tab: OrgSubmenu) => {
    setActiveSubmenu(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  // Fetch all events (org privileged)
  const fetchAllEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      setEventsError(null);
      const res = await fetch(`${PUBLIC_API_BASE_URL}/events?all=true`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (res.status === 200) {
        setIsAuthorized(true);
        const data = await res.json();
        const evList: EventItem[] = Array.isArray(data.events) ? data.events : [];
        setEvents(evList);
        if (evList.length > 0 && !selectedOverviewEventCode) {
          setSelectedOverviewEventCode(evList[0].code);
        }
      } else if (res.status === 401 || res.status === 403) {
        setIsAuthorized(false);
        setAuthError('Access Denied: You do not have the required organizer role.');
      } else {
        throw new Error(`Failed to load events (status ${res.status})`);
      }
    } catch (err: any) {
      console.error('Error fetching all events:', err);
      if (isAuthorized === null) {
        setIsAuthorized(false);
        setAuthError('Access Denied or network error verifying organizer permissions.');
      }
      setEventsError(err.message || 'Failed to load events.');
    } finally {
      setEventsLoading(false);
    }
  }, [selectedOverviewEventCode, isAuthorized]);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  // Fetch registrations for selected overview event
  const fetchOverviewRegistrations = useCallback(async (eventCode: string) => {
    if (!eventCode) return;
    try {
      setRegLoading(true);
      const res = await fetch(
        `${PUBLIC_API_BASE_URL}/registrations?event=${encodeURIComponent(eventCode)}`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        }
      );

      if (res.status === 200) {
        const data = await res.json();
        const raw = Array.isArray(data.registrations) ? data.registrations : [];
        const mapped: RegistrationItem[] = raw.map((r: any) => ({
          ...r,
          username: r.User?.Username || r.username || 'Unknown',
        }));
        setRegistrations(mapped);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setRegistrations([]);
    } finally {
      setRegLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubmenu === 'overview' && selectedOverviewEventCode) {
      fetchOverviewRegistrations(selectedOverviewEventCode);
    }
  }, [activeSubmenu, selectedOverviewEventCode, fetchOverviewRegistrations]);

  // Toggle event enabled
  const handleToggleEvent = async (ev: EventItem) => {
    try {
      setTogglingEventId(ev.id);
      const res = await fetch(`${PUBLIC_API_BASE_URL}/events/${ev.id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) =>
          prev.map((e) => (e.id === ev.id ? { ...e, enabled: updated.enabled } : e))
        );
      } else {
        alert('Failed to toggle event enabled status.');
      }
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Network error while toggling event.');
    } finally {
      setTogglingEventId(null);
    }
  };

  // Open Edit Event
  const openEditModal = (ev: EventItem) => {
    setEditingEvent(ev);
    setEditName(ev.name);
    setEditLocation(ev.location || '');
    setEditDescription(ev.description || '');
    const validStatus = ev.status === 'past' ? 'past' : 'future';
    setEditStatus(validStatus);
    setEditEnabled(ev.enabled);
    setEditStartDate(ev.start_date ? ev.start_date.substring(0, 10) : '');
    setEditEndDate(ev.end_date ? ev.end_date.substring(0, 10) : '');
    setEditError(null);
  };

  // Submit Edit Event
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    try {
      setEditSubmitting(true);
      setEditError(null);

      const payload: any = {
        name: editName.trim(),
        location: editLocation.trim(),
        description: editDescription.trim(),
        status: editStatus,
        enabled: editEnabled,
      };
      if (editStartDate) payload.start_date = new Date(editStartDate).toISOString();
      if (editEndDate) payload.end_date = new Date(editEndDate).toISOString();

      const res = await fetch(`${PUBLIC_API_BASE_URL}/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingEvent(null);
        await fetchAllEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.detail || 'Failed to update event.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Submit Create Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCode.trim() || !createName.trim()) {
      setCreateError('Event code and name are required.');
      return;
    }
    try {
      setCreateSubmitting(true);
      setCreateError(null);

      const payload: any = {
        code: createCode.trim(),
        name: createName.trim(),
        location: createLocation.trim(),
        description: createDescription.trim(),
        status: createStatus,
        enabled: createEnabled,
      };
      if (createStartDate) payload.start_date = new Date(createStartDate).toISOString();
      if (createEndDate) payload.end_date = new Date(createEndDate).toISOString();

      const res = await fetch(`${PUBLIC_API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setCreateCode('');
        setCreateName('');
        setCreateStartDate('');
        setCreateEndDate('');
        setCreateLocation('');
        setCreateDescription('');
        setCreateStatus('future');
        setCreateEnabled(false);
        await fetchAllEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.detail || 'Failed to create event.');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Network error.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filtered registrations for overview
  const filteredRegistrations = useMemo(() => {
    let list = registrations;
    if (regFilter === 'joined') {
      list = list.filter((r) => !r.cancelled);
    } else if (regFilter === 'cancelled') {
      list = list.filter((r) => r.cancelled);
    }
    if (regSearch.trim()) {
      const q = regSearch.toLowerCase().trim();
      list = list.filter((r) => {
        const matchUser = r.username.toLowerCase().includes(q);
        const matchNote = r.note ? r.note.toLowerCase().includes(q) : false;
        const matchFood = r.food_restrictions ? r.food_restrictions.toLowerCase().includes(q) : false;
        return matchUser || matchNote || matchFood;
      });
    }
    return list;
  }, [registrations, regFilter, regSearch]);

  const overviewStats = useMemo(() => {
    const joined = registrations.filter((r) => !r.cancelled);
    return {
      total: registrations.length,
      joined: joined.length,
      cancelled: registrations.length - joined.length,
      paid: joined.filter((r) => r.paid).length,
      kids: joined.reduce((acc, r) => acc + (r.children_count || 0), 0),
    };
  }, [registrations]);

  // Auth checking state
  if (isAuthorized === null && eventsLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Checking authorization...</span>
        </div>
        <p className="mt-3 text-secondary">Verifying organizer permissions...</p>
      </div>
    );
  }

  // Access denied state
  if (isAuthorized === false) {
    return (
      <div className="box p-4 border border-danger text-center">
        <i className="bi bi-shield-x text-danger display-4 mb-3 d-block"></i>
        <h3 className="text-danger mb-2">Access Denied;</h3>
        <p className="text-secondary mb-4">
          {authError || 'You do not have organizer permissions to access this area.'}
        </p>
        <a href="/user" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>Return to Profile
        </a>
      </div>
    );
  }

  return (
    <div className="org-dashboard">
      <style>{`
        .org-submenu {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 0.5rem;
        }
        .org-submenu-item {
          color: #b9bbbe;
          background: transparent;
          border: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .org-submenu-item:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.05);
        }
        .org-submenu-item.active {
          color: #5865f2;
          background-color: rgba(88, 101, 242, 0.1);
        }
      `}</style>

      {/* Submenu Navigation - Visually consistent with member area menu */}
      <div className="org-submenu mb-4">
        <div className="d-flex flex-wrap gap-2 gap-md-3">
          <button
            type="button"
            onClick={() => switchSubmenu('events')}
            className={clsx('org-submenu-item', activeSubmenu === 'events' && 'active')}
          >
            <i className="bi bi-gear-wide-connected me-2"></i>events administration
          </button>

          <button
            type="button"
            onClick={() => switchSubmenu('overview')}
            className={clsx('org-submenu-item', activeSubmenu === 'overview' && 'active')}
          >
            <i className="bi bi-people-fill me-2"></i>event overview
          </button>

          <button
            type="button"
            onClick={() => switchSubmenu('achievements')}
            className={clsx('org-submenu-item', activeSubmenu === 'achievements' && 'active')}
          >
            <i className="bi bi-trophy-fill me-2"></i>global achievements
          </button>
        </div>
      </div>

      {/* SUBMENU 1: Events Administration */}
      {activeSubmenu === 'events' && (
        <div className="events-admin-section">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="mb-4">Events Administration;</h3>
              <p className="text-secondary small mb-0">
                Configure event registration status, dates, and create new editions.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-success d-flex align-items-center gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span>Create Event</span>
            </button>
          </div>

          {eventsError && (
            <div className="alert alert-danger py-2 mb-3 small">{eventsError}</div>
          )}

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Registration</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  let statusBadgeClass = 'bg-info text-dark';
                  if (ev.status === 'past') {
                    statusBadgeClass = 'bg-dark text-secondary border border-secondary';
                  }

                  let regBadgeClass = 'bg-danger';
                  let regBadgeText = 'Locked';
                  if (ev.enabled) {
                    regBadgeClass = 'bg-success';
                    regBadgeText = 'Open';
                  }

                  let datesText = 'Dates TBD';
                  if (ev.start_date && ev.end_date) {
                    datesText = `${new Date(ev.start_date).toLocaleDateString()} – ${new Date(ev.end_date).toLocaleDateString()}`;
                  }

                  const isToggling = togglingEventId === ev.id;
                  let toggleBtnContent = (
                    <>
                      <i className="bi bi-unlock-fill me-1"></i>Enable
                    </>
                  );
                  if (isToggling) {
                    toggleBtnContent = <span className="spinner-border spinner-border-sm" role="status"></span>;
                  } else if (ev.enabled) {
                    toggleBtnContent = (
                      <>
                        <i className="bi bi-lock-fill me-1"></i>Lock
                      </>
                    );
                  }

                  return (
                    <tr key={ev.id}>
                      <td>
                        <code>{ev.code}</code>
                      </td>
                      <td>
                        <strong>{ev.name}</strong>
                        {ev.location && (
                          <div className="text-secondary small">
                            <i className="bi bi-geo-alt me-1"></i>
                            {ev.location}
                          </div>
                        )}
                      </td>
                      <td className="small text-secondary">{datesText}</td>
                      <td>
                        <span className={clsx('badge', statusBadgeClass)}>{ev.status}</span>
                      </td>
                      <td>
                        <span className={clsx('badge', regBadgeClass)}>{regBadgeText}</span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            type="button"
                            className={clsx(
                              'btn btn-sm',
                              ev.enabled ? 'btn-outline-warning' : 'btn-outline-success'
                            )}
                            disabled={isToggling}
                            onClick={() => handleToggleEvent(ev)}
                            title={ev.enabled ? 'Lock / Close Registration' : 'Open Registration'}
                          >
                            {toggleBtnContent}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEditModal(ev)}
                          >
                            <i className="bi bi-pencil-fill me-1"></i>Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMENU 2: Event Overview (Attendees) */}
      {activeSubmenu === 'overview' && (
        <div className="event-overview-section">
          {/* Header & Event Selector */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
              <h3 className="mb-4">Event Overview;</h3>
              <p className="text-secondary small mb-0">
                View registrations and attendee details for any event.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="overviewEventSelect" className="small text-secondary text-nowrap fw-bold mb-0">
                Select Event:
              </label>
              <select
                id="overviewEventSelect"
                className="form-select form-select-sm bg-dark text-white border-secondary"
                style={{ minWidth: '220px' }}
                value={selectedOverviewEventCode}
                onChange={(e) => setSelectedOverviewEventCode(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.code} value={ev.code}>
                    {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => fetchOverviewRegistrations(selectedOverviewEventCode)}
                disabled={regLoading}
                title="Refresh registrations"
              >
                <i className={clsx('bi bi-arrow-clockwise', regLoading && 'spinner-border spinner-border-sm')}></i>
              </button>
            </div>
          </div>

          {/* Clean Stats Bar (Consistent with previous clean design) */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="box text-center p-3 h-100 bg-dark">
                <span className="text-secondary small">JOINED</span>
                <h2 className="mb-0 text-success">{overviewStats.joined}</h2>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="box text-center p-3 h-100 bg-dark">
                <span className="text-secondary small">PAID</span>
                <h2 className="mb-0 text-primary">{overviewStats.paid}</h2>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="box text-center p-3 h-100 bg-dark">
                <span className="text-secondary small">KIDS</span>
                <h2 className="mb-0 text-info">{overviewStats.kids}</h2>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="box text-center p-3 h-100 bg-dark">
                <span className="text-secondary small">CANCELLED</span>
                <h2 className="mb-0 text-danger">{overviewStats.cancelled}</h2>
              </div>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={clsx('btn btn-outline-secondary', regFilter === 'joined' && 'active')}
                onClick={() => setRegFilter('joined')}
              >
                Joined ({overviewStats.joined})
              </button>
              <button
                type="button"
                className={clsx('btn btn-outline-secondary', regFilter === 'cancelled' && 'active')}
                onClick={() => setRegFilter('cancelled')}
              >
                Cancelled ({overviewStats.cancelled})
              </button>
              <button
                type="button"
                className={clsx('btn btn-outline-secondary', regFilter === 'all' && 'active')}
                onClick={() => setRegFilter('all')}
              >
                All ({overviewStats.total})
              </button>
            </div>

            <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark text-white border-secondary"
                placeholder="Search attendee..."
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          {regLoading && (
            <div className="text-center p-4">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          )}

          {!regLoading && filteredRegistrations.length === 0 && (
            <div className="alert alert-secondary text-center py-4">
              No registrations found for {selectedOverviewEventCode || 'this event'}.
            </div>
          )}

          {!regLoading && filteredRegistrations.length > 0 && (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Dates</th>
                    <th>Payment</th>
                    <th>Children</th>
                    <th>Diet & Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((r, idx) => {
                    let arrivalFormatted = '-';
                    if (r.arrival_date) {
                      arrivalFormatted = new Date(r.arrival_date).toLocaleDateString();
                    }
                    let departureFormatted = '-';
                    if (r.departure_date) {
                      departureFormatted = new Date(r.departure_date).toLocaleDateString();
                    }

                    return (
                      <tr key={r.id || idx} className={clsx(r.cancelled && 'opacity-50')}>
                        <td>
                          <strong>{r.username}</strong>
                          {r.cancelled && <span className="badge bg-danger ms-2">Cancelled</span>}
                        </td>
                        <td className="small text-secondary">
                          {arrivalFormatted} &rarr; {departureFormatted}
                        </td>
                        <td>
                          {r.paid ? (
                            <span className="badge bg-success">Paid</span>
                          ) : (
                            <span className="badge bg-secondary">Unpaid</span>
                          )}
                        </td>
                        <td>{r.children_count || 0}</td>
                        <td className="small text-secondary">
                          {r.food_restrictions && (
                            <div>
                              <strong className="text-light">Diet:</strong> {r.food_restrictions}
                            </div>
                          )}
                          {r.note && (
                            <div>
                              <strong className="text-light">Note:</strong> {r.note}
                            </div>
                          )}
                          {!r.food_restrictions && !r.note && <span>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBMENU 3: Global Achievements */}
      {activeSubmenu === 'achievements' && (
        <div className="achievements-section">
          <div className="mb-4">
            <h3 className="mb-4">Global Achievements;</h3>
            <p className="text-secondary small mb-0">
              Manage awards, icons, and automated Discord achievement roles across all events.
            </p>
          </div>
          <div className="row">
            <div className="col-lg-5 mb-4 mb-lg-0">
              <CreateAchievementForm />
            </div>
            <div className="col-lg-7">
              <OrgAchievementsList />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Event */}
      {showCreateModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-secondary text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">Create New Event;</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateEvent}>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger py-2 small">{createError}</div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Event Code *</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-secondary"
                      placeholder="e.g. g::t::8.0.0"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Event Name *</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-secondary"
                      placeholder="e.g. Garage Trip 8.0.0"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-secondary">Start Date</label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={createStartDate}
                        onChange={(e) => setCreateStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-secondary">End Date</label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={createEndDate}
                        onChange={(e) => setCreateEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Location</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-secondary"
                      placeholder="e.g. Nové Město na Moravě"
                      value={createLocation}
                      onChange={(e) => setCreateLocation(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Description</label>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows={2}
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-secondary">Status</label>
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        value={createStatus}
                        onChange={(e) => setCreateStatus(e.target.value as 'future' | 'past')}
                      >
                        <option value="future">future</option>
                        <option value="past">past</option>
                      </select>
                    </div>
                    <div className="col-6 d-flex align-items-center mt-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="createEnabledCheck"
                          checked={createEnabled}
                          onChange={(e) => setCreateEnabled(e.target.checked)}
                        />
                        <label className="form-check-label small" htmlFor="createEnabledCheck">
                          Registration Open
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={createSubmitting}>
                    {createSubmitting ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Event */}
      {editingEvent && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-secondary text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">Edit Event: {editingEvent.code};</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditingEvent(null)}
                ></button>
              </div>
              <form onSubmit={handleUpdateEvent}>
                <div className="modal-body">
                  {editError && <div className="alert alert-danger py-2 small">{editError}</div>}
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Event Name *</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-secondary"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-secondary">Start Date</label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-secondary">End Date</label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Location</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-secondary"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Description</label>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-secondary">Status</label>
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'future' | 'past')}
                      >
                        <option value="future">future</option>
                        <option value="past">past</option>
                      </select>
                    </div>
                    <div className="col-6 d-flex align-items-center mt-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="editEnabledCheck"
                          checked={editEnabled}
                          onChange={(e) => setEditEnabled(e.target.checked)}
                        />
                        <label className="form-check-label small" htmlFor="editEnabledCheck">
                          Registration Open
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingEvent(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
