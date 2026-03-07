import { useState, useEffect } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';


interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const [authState, setAuthState] = useState<'loading' | 'unauthorized' | 'authorized'>('loading');

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch(`${PUBLIC_API_BASE_URL}/me`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'include',
                });

                if (response.status === 200) {
                    setAuthState('authorized');
                } else {
                    setAuthState('unauthorized');
                    // Redirect to login with current path as redirect parameter
                    const currentPath = window.location.pathname;
                    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                }
            } catch (error) {
                console.error('Auth guard check failed:', error);
                setAuthState('unauthorized');
                // On error, also redirect but maybe just to /login or show error
                window.location.href = '/login';
            }
        };

        checkAuth();
    }, []);

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

    if (authState === 'authorized') {
        return <>{children}</>;
    }

    // While redirecting
    return null;
}
