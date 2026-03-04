import React, { useState } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';

export default function CreateAchievementForm() {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!name || !code || !image) {
            setError('Please fill in all fields.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('code', code);
        formData.append('image', image);

        setLoading(true);

        try {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/achievements/create`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                // Success
                const data = await response.json();
                setSuccessMsg(`Achievement created successfully! ID: ${data.id}, Discord Role ID: ${data.discord_role_id}`);
                // reset form
                setName('');
                setCode('');
                setImage(null);

                // Clear the file input visually
                const fileInput = document.getElementById('achievementImage') as HTMLInputElement;
                if (fileInput) fileInput.value = '';

            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { detail: 'Unknown error occurred.' };
                }

                if (response.status === 401 || response.status === 403) {
                    setError('Unauthorized: You do not have permission to create achievements.');
                } else if (errorData.detail) {
                    setError(`Failed: ${errorData.detail}`);
                } else {
                    setError(`Failed: HTTP ${response.status}`);
                }
            }
        } catch (err: any) {
            console.error('Create achievement failed:', err);
            setError(`Network error: ${err.message || 'Could not connect to the API'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="box p-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h4 className="mb-4">Create New Achievement</h4>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="alert alert-success" role="alert">
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3 text-start">
                    <label htmlFor="achievementName" className="form-label text-secondary">Name</label>
                    <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        id="achievementName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Early Bird"
                        required
                    />
                </div>

                <div className="mb-3 text-start">
                    <label htmlFor="achievementCode" className="form-label text-secondary">Code</label>
                    <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        id="achievementCode"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g. early_bird"
                        required
                    />
                </div>

                <div className="mb-4 text-start">
                    <label htmlFor="achievementImage" className="form-label text-secondary">Image</label>
                    <input
                        type="file"
                        className="form-control bg-dark text-white border-secondary"
                        id="achievementImage"
                        onChange={handleImageChange}
                        accept="image/*"
                        required
                    />
                    <div className="form-text text-secondary">Upload an icon or image for the achievement.</div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Creating...
                        </>
                    ) : (
                        'Create Achievement'
                    )}
                </button>
            </form>
        </div>
    );
}

