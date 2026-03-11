import { useState, useEffect, useCallback } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';
import { getAchievementImageUrl } from '../../utils/achievement';

interface Achievement {
    name: string;
    image_data: string;
    discord_role_id: string;
}

export default function OrgAchievementsList() {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchAchievements = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/org/achievements`, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setAchievements(data.achievements || []);
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { detail: 'Unknown error occurred.' };
                }
                setError(`Failed: ${errorData.detail || response.statusText}`);
            }
        } catch (err: any) {
            setError(`Network error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);

    if (loading) {
        return (
            <div className="box p-4 mt-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="box p-4 mt-4 text-center">
                <div className="text-danger mb-3">{error}</div>
                <button className="btn btn-outline-primary" onClick={fetchAchievements}>Retry</button>
            </div>
        );
    }

    return (
        <div className="box p-4 mt-4">
            <h4 className="mb-4 d-flex justify-content-between align-items-center">
                <span>Achievements</span>
                <button className="btn btn-sm btn-outline-secondary" onClick={fetchAchievements}>
                    <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </h4>
            
            {achievements.length === 0 ? (
                <div className="text-center text-muted py-4">
                    No achievements found.
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Discord Role ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {achievements.map((a) => (
                                <tr key={a.id}>
                                    <td>
                                        {a.image_data ? (
                                            <img 
                                                src={getAchievementImageUrl(a.image_data)} 
                                                alt={a.name} 
                                                width="40" 
                                                className="rounded bg-dark cursor-pointer" 
                                                onClick={() => setSelectedImage(getAchievementImageUrl(a.image_data))}
                                                style={{ cursor: 'pointer', height: 'auto', maxWidth: '40px' }}
                                            />
                                        ) : (
                                            <div className="bg-secondary rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                <i className="bi bi-image text-light"></i>
                                            </div>
                                        )}
                                    </td>
                                    <td className="fw-bold">{a.name}</td>
                                    <td className="text-muted small">{a.discord_role_id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div 
                    className="modal show d-block" 
                    tabIndex={-1} 
                    style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-transparent border-0">
                            <div className="modal-body text-center p-0">
                                <img src={selectedImage} alt="Large achievement" className="img-fluid rounded shadow-lg" style={{ maxHeight: '80vh' }} />
                                <button className="btn btn-sm btn-light mt-3 position-absolute top-0 end-0 m-3" onClick={() => setSelectedImage(null)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
