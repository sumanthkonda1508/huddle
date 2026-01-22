import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Added Google imports
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

export default function LoginPage() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showDialog } = useDialog();

    useEffect(() => {
        // Only redirect if verified (or we allow unverified access to some parts but not others? User said "all users needs to be done")
        // Implementation: Block login if not verified.
        // So checking currentUser here is tricky if we auto-login on signup.
        // If currentUser exists and is verified, redirect.
        if (currentUser && currentUser.emailVerified) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Sync user to backend
            await api.syncUser({
                displayName: user.displayName,
                photoURL: user.photoURL
            });

            navigate('/');
        } catch (error) {
            console.error("Google Login Error:", error);
            showDialog({
                title: 'Login Failed',
                message: "Failed to sign in with Google: " + error.message,
                type: 'error'
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isSignup) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName });
                await api.syncUser({ displayName });

                // Send Verification Email
                await sendEmailVerification(userCredential.user);
                showDialog({
                    title: 'Account Created',
                    message: "Account created! A verification link has been sent to your email. Please verify before logging in.",
                    type: 'success'
                });

                // Sign out immediately so they can't access app until verified
                await signOut(auth);
                // Stay on login page or switch to login mode
                setIsSignup(false);

            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    showDialog({
                        title: 'Verification Required',
                        message: "Please verify your email address to login. Check your inbox.",
                        type: 'alert'
                    });
                    return;
                }

                await api.syncUser({});
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            let msg = error.message;
            if (error.code === 'auth/email-already-in-use') {
                msg = 'Account already exists. Please switch to Login.';
            } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                msg = 'Invalid email or password.';
            }
            showDialog({
                title: 'Authentication Error',
                message: msg,
                type: 'error'
            });
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 160px)', /* Account for Header + App Padding */
            backgroundColor: '#F8FAFC',
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem',
                backgroundColor: 'white',
                borderRadius: 'var(--radius)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        {isSignup ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isSignup ? 'Join the community today' : 'Please sign in to continue'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {isSignup && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Full Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder="John Doe"
                                required
                                className="input-field"
                            />
                        </div>
                    )}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="input-field"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn" style={{ padding: '0.875rem', fontSize: '1rem' }}>
                            {isSignup ? 'Sign Up' : 'Sign In'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                            OR
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="btn-secondary"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                background: 'white',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
                            Sign in with Google
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                    {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textDecoration: 'none', /* Removed underline for cleaner look */
                            padding: 0
                        }}
                    >
                        {isSignup ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
