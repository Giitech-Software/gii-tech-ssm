importScripts("https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js");
firebase.initializeApp({ apiKey: "AIzaSyBmKo8JeLv2ILRvPtwMqyUjy7jwvfkvnRI", authDomain: "giitech-ssm.firebaseapp.com", projectId: "giitech-ssm", storageBucket: "giitech-ssm.appspot.com", messagingSenderId: "342915985863", appId: "1:342915985863:web:d5ed22998d2b095788e9e2" });
firebase.messaging().onBackgroundMessage((payload) => self.registration.showNotification(payload.notification?.title || "Giitech-SSM notification", { body: payload.notification?.body || "You have a new school notification.", icon: "/vite.svg" }));
