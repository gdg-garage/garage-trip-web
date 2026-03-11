import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';

const EVENT_ID = 'g::t::7.0.0';

interface MeData {
    username: string;
    email?: string;
}

interface UserAchievement {
    name: string;
    image: string;
}

export default function UserProfile() {
    const [authState, setAuthState] = useState<'loading' | 'unauthorized' | 'authorized'>('loading');
    const [userData, setUserData] = useState<MeData | null>(null);
    const [achievements, setAchievements] = useState<UserAchievement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/me?event=${EVENT_ID}`, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (response.status === 200) {
                const data: MeData = await response.json();
                setUserData(data);

                try {
                    const achRes = await fetch(`${PUBLIC_API_BASE_URL}/me/achievements`, {
                        headers: { Accept: 'application/json' },
                        credentials: 'include',
                    });
                    if (achRes.ok) {
                        const achData = await achRes.json();
                        setAchievements(achData.achievements || []);
                    }
                } catch (e) {
                    console.error('Failed to load achievements', e);
                }

                setAuthState('authorized');
            } else if (response.status === 401) {
                setAuthState('unauthorized');
            } else {
                throw new Error('Unexpected status: ' + response.status);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setError('Something went wrong while checking your authentication status.');
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleLogout = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/auth/logout`, {
                method: 'GET', // or POST if required, but usually GET for simple logout links
                credentials: 'include',
            });
            // Try to clear common cookies just in case they aren't HTTP-only
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

            setAuthState('unauthorized');
            setUserData(null);
            // Redirect to home or login page after a short delay
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
            // If fetch fails, still try to redirect to the logout URL directly
            window.location.href = `${PUBLIC_API_BASE_URL}/auth/logout`;
        }
    }, []);

    if (authState === 'loading') {
        return (
            <div className="row justify-content-center mt-5">
                <div className="col-md-6 text-center">
                    <div className="box">
                        <div className="spinner-border text-primary mx-auto mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p>Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="row justify-content-center mt-5">
                <div className="col-md-6">
                    <div className="box text-danger">
                        <h3>error;</h3>
                        <p>{error}</p>
                        <button className="button light mt-3" onClick={() => location.reload()}>
                            Retry
                        </button>
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
                        <h3 className="mb-4">authentication required;</h3>
                        <p className="mb-4">
                            You need to be logged in to view your profile.
                        </p>
                        <div className="d-flex justify-content-center mt-3">
                            <a
                                href={`${PUBLIC_API_BASE_URL}/auth/discord/login`}
                                className="button purple big"
                                onClick={() => sessionStorage.setItem('login_redirect', '/user')}
                            >
                                <i className="bi bi-discord me-2"></i> Login via Discord
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="row mt-4">
            <div className="col-lg-6 offset-lg-3">
                <div className="box">
                    <div className="d-flex justify-content-between align-items-center mb-5">
                        <h3 className="mb-0">profile;</h3>
                        <button onClick={handleLogout} className="button light">
                            <i className="bi bi-box-arrow-right me-2"></i> Logout
                        </button>
                    </div>

                    <div className="profile-info mb-5">
                        <div className="mb-4">
                            <label className="text-secondary small text-uppercase fw-bold mb-1 d-block">Username</label>
                            <div className="fs-4 secondary-color fw-bold">{userData?.username}</div>
                        </div>

                        <div className="mb-2">
                            <label className="text-secondary small text-uppercase fw-bold mb-1 d-block">Email</label>
                            <div className="fs-5 text-light">{userData?.email || 'not provided;'}</div>
                        </div>

                        {achievements.length > 0 && (
                            <div className="mt-5">
                                <label className="text-secondary small text-uppercase fw-bold mb-3 d-block">Achievements</label>
                                <div className="d-flex flex-wrap gap-3">
                                    {achievements.map((a, i) => (
                                        <div key={i} className="text-center" style={{ width: '80px' }}>
                                            {a.image ? (
                                                <img 
                                                    src={a.image.startsWith('http') ? a.image : `${PUBLIC_API_BASE_URL}/${a.image.replace(/^\//, '')}`} 
                                                    alt={a.name} 
                                                    width="64" 
                                                    className="rounded mb-2 bg-dark mx-auto d-block cursor-pointer" 
                                                    style={{ cursor: 'pointer', height: 'auto', maxWidth: '64px' }}
                                                    onClick={() => setSelectedImage(a.image.startsWith('http') ? a.image : `${PUBLIC_API_BASE_URL}/${a.image.replace(/^\//, '')}`)}
                                                />
                                            ) : (
                                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-2 mx-auto" style={{ width: '64px', height: '64px' }}>
                                                    <i className="bi bi-trophy fs-3 text-light"></i>
                                                </div>
                                            )}
                                            <div className="small fw-bold text-light text-wrap mx-auto" style={{ wordBreak: 'break-word', lineHeight: '1.2' }}>{a.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div 
                    className="modal show d-block" 
                    tabIndex={-1} 
                    style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}
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
