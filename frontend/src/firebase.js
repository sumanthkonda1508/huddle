// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAVkYaKPME_0w_AD9Mhq6uwC3F07n7JWz4",
    authDomain: "huddle-932bb.firebaseapp.com",
    projectId: "huddle-932bb",
    storageBucket: "huddle-932bb.firebasestorage.app",
    messagingSenderId: "508309920154",
    appId: "1:508309920154:web:e0741b1730ace4bd80c223",
    measurementId: "G-XNGHT67J7V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export default app;
