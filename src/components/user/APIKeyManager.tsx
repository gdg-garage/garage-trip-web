import { useState, useEffect, useCallback } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';

import clsx from 'clsx';

interface APIKey {
    id: number;
    name: string;
    key: string;
    created_at: string;
    expires_at?: string;
    last_used_at?: string;
}

export default function APIKeyManager() {
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<APIKey | null>(null);

    const fetchKeys = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/api-keys`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                setKeys(data || []);
            } else {
                throw new Error('Failed to fetch API keys');
            }
        } catch (err) {
            console.error(err);
            setError('Could not load API keys.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        try {
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Default to 1 year

            const response = await fetch(`${PUBLIC_API_BASE_URL}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: newKeyName,
                    expires_at: expiresAt.toISOString()
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setCreatedKey(data);
                setNewKeyName('');
                fetchKeys();
            } else {
                alert('Failed to create API key');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating API key');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this API key?')) return;

        try {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/api-keys/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                fetchKeys();
            } else {
                alert('Failed to delete API key');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting API key');
        }
    };

    if (loading && keys.length === 0) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="api-key-manager">
            <div className="row mb-5">
                <div className="col-lg-12">
                    <div className="card bg-dark border-secondary">
                        <div className="card-body p-4">
                            <h5 className="card-title text-white mb-4">Create New API Key;</h5>
                            <form onSubmit={handleCreate} className="row g-3">
                                <div className="col-md-9">
                                    <input
                                        type="text"
                                        className="form-control bg-dark text-white border-secondary"
                                        placeholder="Key name (e.g. My Integration)"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-3">
                                    <button type="submit" className="button purple w-100">
                                        Create Key
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {createdKey && (
                <div className="alert alert-success bg-dark border-success text-white mb-5">
                    <h5 className="alert-heading fw-bold">Important: New API Key Created!</h5>
                    <p>This key will only be shown **once**. Copy it now and store it securely.</p>
                    <div className="input-group mb-3">
                        <input
                            type="text"
                            className="form-control bg-black text-success border-success font-monospace"
                            value={createdKey.key}
                            readOnly
                        />
                        <button
                            className="btn btn-outline-success"
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(createdKey.key);
                                alert('Copied to clipboard!');
                            }}
                        >
                            <i className="bi bi-clipboard me-1"></i> Copy
                        </button>
                    </div>
                    <button
                        className="btn btn-sm btn-success"
                        onClick={() => setCreatedKey(null)}
                    >
                        I have saved the key
                    </button>
                </div>
            )}

            <div className="keys-list mt-4">
                <h5 className="text-white mb-4">Your API Keys;</h5>
                {keys.length === 0 ? (
                    <p className="text-secondary italic">No API keys found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table custom-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Key (Masked)</th>
                                    <th>Created</th>
                                    <th>Last Used</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map((key) => (
                                    <tr key={key.id}>
                                        <td>{key.name}</td>
                                        <td className="monospace text-secondary">{key.key}</td>
                                        <td>{new Date(key.created_at).toLocaleDateString()}</td>
                                        <td>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                                        <td className="text-end">
                                            <button
                                                className="btn btn-link text-danger p-0"
                                                onClick={() => handleDelete(key.id)}
                                                title="Delete Key"
                                            >
                                                <i className="bi bi-trash3 fs-5"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
