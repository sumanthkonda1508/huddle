import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth'; // Added sendEmailVerification, signOut
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    useEffect(() => {
        // Only redirect if verified (or we allow unverified access to some parts but not others? User said "all users needs to be done")
        // Implementation: Block login if not verified.
        // So checking currentUser here is tricky if we auto-login on signup.
        // If currentUser exists and is verified, redirect.
        if (currentUser && currentUser.emailVerified) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isSignup) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName });
                await api.syncUser({ displayName });

                // Send Verification Email
                await sendEmailVerification(userCredential.user);
                alert("Account created! A verification link has been sent to your email. Please verify before logging in.");

                // Sign out immediately so they can't access app until verified
                await signOut(auth);
                // Stay on login page or switch to login mode
                setIsSignup(false);

            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    alert("Please verify your email address to login. Check your inbox.");
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
            alert(msg);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {isSignup ? 'Create Account' : 'Welcome Back'}
                </h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {isSignup && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
                                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="John Doe" required className="input-field" />
                            </div>
                        </>
                    )}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-field" />
                    </div>
                    <button type="submit" className="btn" style={{ marginTop: '1rem' }}>
                        {isSignup ? 'Sign Up' : 'Login'}
                    </button>
                </form>
                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {isSignup ? 'Already have an account? ' : 'New here? '}
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', padding: 0 }}
                    >
                        {isSignup ? 'Login' : 'Create Account'}
                    </button>
                </div>
            </div>
        </div>
    );
}
