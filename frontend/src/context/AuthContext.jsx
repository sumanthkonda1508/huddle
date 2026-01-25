import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import client from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        if (currentUser) {
            try {
                const res = await client.get(`/users/${currentUser.uid}`);
                setUserProfile(res.data);
            } catch (e) {
                console.error("Failed to refresh profile", e);
            }
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Sync user with backend or fetch profile
                try {
                    // Optimistically sync
                    await client.post('/users/sync', {
                        displayName: user.displayName,
                        email: user.email
                    });
                    // Then get full profile including role
                    const res = await client.get(`/users/${user.uid}`);
                    setUserProfile(res.data);
                } catch (e) {
                    console.error("Failed to sync user", e);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        loading,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
