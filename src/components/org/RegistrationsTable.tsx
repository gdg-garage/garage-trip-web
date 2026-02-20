import { useState, useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'https://api.garage-trip.cz';
const EVENT_ID = 'g::t::7.0.0';

interface UserRegistration {
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

export default function RegistrationsTable() {
    const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'joined' | 'cancelled'>('joined');

    const fetchRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/registrations?event=${EVENT_ID}`, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (response.status === 200) {
                const data = await response.json();
                console.log('Fetched registrations data:', data);
                // API returns { registrations: [...] }
                const rawRegistrations = Array.isArray(data.registrations) ? data.registrations : [];

                // Map the data to include username from User object
                const mappedRegistrations = rawRegistrations.map((reg: any) => ({
                    ...reg,
                    username: reg.User?.Username || 'Unknown'
                }));

                console.log('Mapped registrations:', mappedRegistrations);
                setRegistrations(mappedRegistrations);
            } else if (response.status === 401 || response.status === 403) {
                setError('Unauthorized: You do not have permission to view this page.');
            } else {
                throw new Error('Failed to fetch registrations: ' + response.status);
            }
        } catch (err) {
            console.error('Fetch registrations failed:', err);
            setError('Something went wrong while fetching registrations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const stats = useMemo(() => {
        const joined = registrations.filter(r => !r.cancelled);
        const paid = joined.filter(r => r.paid).length;
        const totalKids = joined.reduce((acc, r) => acc + (r.children_count || 0), 0);
        return {
            total: registrations.length,
            joined: joined.length,
            cancelled: registrations.length - joined.length,
            paid,
            totalKids
        };
    }, [registrations]);

    const filteredRegistrations = useMemo(() => {
        let result = registrations;
        if (filter === 'joined') result = registrations.filter(r => !r.cancelled);
        else if (filter === 'cancelled') result = registrations.filter(r => r.cancelled);

        console.log('Filtered registrations (filter:', filter, '):', result);
        return result;
    }, [registrations, filter]);

    if (loading) {
        return (
            <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading registrations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="box text-danger">
                <h3>Error;</h3>
                <p>{error}</p>
                <button className="button light mt-3" onClick={() => fetchRegistrations()}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="registrations-container">
            <div className="row mb-4 gy-3">
                <div className="col-6 col-md-3">
                    <div className="box text-center p-3 h-100">
                        <span className="text-secondary small">JOINED</span>
                        <h2 className="mb-0">{stats.joined}</h2>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="box text-center p-3 h-100">
                        <span className="text-secondary small">PAID</span>
                        <h2 className="mb-0 text-success">{stats.paid}</h2>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="box text-center p-3 h-100">
                        <span className="text-secondary small">KIDS</span>
                        <h2 className="mb-0 text-info">{stats.totalKids}</h2>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="box text-center p-3 h-100">
                        <span className="text-secondary small">CANCELLED</span>
                        <h2 className="mb-0 text-danger">{stats.cancelled}</h2>
                    </div>
                </div>
            </div>

            <div className="box overflow-auto">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                    <h3>Registrations;</h3>

                    <div className="d-flex gap-2">
                        <div className="btn-group">
                            <button
                                className={clsx('btn btn-sm btn-outline-secondary', filter === 'joined' && 'active')}
                                onClick={() => setFilter('joined')}
                            >
                                Joined
                            </button>
                            <button
                                className={clsx('btn btn-sm btn-outline-secondary', filter === 'cancelled' && 'active')}
                                onClick={() => setFilter('cancelled')}
                            >
                                Cancelled
                            </button>
                            <button
                                className={clsx('btn btn-sm btn-outline-secondary', filter === 'all' && 'active')}
                                onClick={() => setFilter('all')}
                            >
                                All
                            </button>
                        </div>
                        <button className="btn btn-sm btn-outline-primary" onClick={fetchRegistrations}>
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>

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
                        {filteredRegistrations.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center p-4">No registrations found.</td>
                            </tr>
                        ) : (
                            filteredRegistrations.map((reg, idx) => (
                                <tr key={idx} className={clsx({ 'opacity-50': reg.cancelled })}>
                                    <td>{reg.username}</td>
                                    <td>
                                        <span className={clsx('badge', reg.cancelled ? 'bg-danger' : 'bg-success')}>
                                            {reg.cancelled ? 'Cancelled' : 'Joined'}
                                        </span>
                                    </td>
                                    <td>
                                        <i className={clsx('bi', reg.paid ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-warning')}></i>
                                    </td>
                                    <td>{reg.arrival_date ? new Date(reg.arrival_date).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                                    <td>{reg.departure_date ? new Date(reg.departure_date).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                                    <td>{reg.children_count || 0}</td>
                                    <td className="small text-truncate" style={{ maxWidth: '150px' }} title={reg.food_restrictions}>{reg.food_restrictions || '-'}</td>
                                    <td className="small text-truncate" style={{ maxWidth: '200px' }} title={reg.note}>{reg.note || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
