import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'https://api.garage-trip.cz';

interface Props {
    activeId?: string;
}

export default function UserHeaderLink({ activeId }: Props) {
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/me`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'include',
                });
                if (response.status === 200) {
                    setIsAuthorized(true);
                }
            } catch (error) {
                // Silent fail, just don't show the link
            }
        };
        checkAuth();
    }, []);

    if (!isAuthorized) {
        return null;
    }

    return (
        <a
            className={`menu-link ${activeId === 'user' ? 'active' : ''}`}
            href="/user"
        >
            /user
        </a>
    );
}
