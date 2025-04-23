/**
 * Firebase Integration Module
 * Handles all storage operations through Firebase
 */

const FirebaseStorage = {
  db: null,
  isInitialized: false,
  
  // Initialize Firebase
  async init() {
    try {
      // Check if Firebase is already initialized
      if (this.isInitialized) {
        console.log('Firebase already initialized');
        return true;
      }
      
      // Initialize Firebase app
      const firebaseConfig = {
        apiKey: "YOUR_API_KEY_HERE",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
      };
      
      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      this.isInitialized = true;
      
      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      return false;
    }
  },
  
  // Save history data (quotes and invoices)
  async saveHistory(historyData) {
    try {
      if (!this.isInitialized) await this.init();
      
      await this.db.collection('history').doc('user_data').set({ data: historyData });
      console.log('History data saved to Firebase');
      return true;
    } catch (error) {
      console.error('Error saving history data:', error);
      return false;
    }
  },
  
  // Load history data
  async loadHistory() {
    try {
      if (!this.isInitialized) await this.init();
      
      const doc = await this.db.collection('history').doc('user_data').get();
      if (doc.exists) {
        console.log('History data loaded from Firebase');
        return doc.data().data || [];
      } else {
        console.log('No history data found in Firebase');
        return [];
      }
    } catch (error) {
      console.error('Error loading history data:', error);
      return [];
    }
  },
  
  // Save calendar availability data
  async saveCalendarData(availability) {
    try {
      if (!this.isInitialized) await this.init();
      
      await this.db.collection('calendar').doc('availability').set(availability);
      console.log('Calendar data saved to Firebase');
      return true;
    } catch (error) {
      console.error('Error saving calendar data:', error);
      return false;
    }
  },
  
  // Load calendar availability data
  async loadCalendarData() {
    try {
      if (!this.isInitialized) await this.init();
      
      const doc = await this.db.collection('calendar').doc('availability').get();
      if (doc.exists) {
        console.log('Calendar data loaded from Firebase');
        return doc.data() || { bookedDates: {}, blockedDates: {} };
      } else {
        console.log('No calendar data found in Firebase');
        return { bookedDates: {}, blockedDates: {} };
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      return { bookedDates: {}, blockedDates: {} };
    }
  },
  
  // Save signature data
  async saveSignatureData(signatureData) {
    try {
      if (!this.isInitialized) await this.init();
      
      // Add to signature collection
      await this.db.collection('signatures').add({
        ...signatureData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Signature data saved to Firebase');
      return true;
    } catch (error) {
      console.error('Error saving signature data:', error);
      return false;
    }
  },
  
  // Load signature history
  async loadSignatureHistory() {
    try {
      if (!this.isInitialized) await this.init();
      
      const snapshot = await this.db.collection('signatures')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      
      const signatures = [];
      snapshot.forEach(doc => {
        signatures.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Signature history loaded from Firebase');
      return signatures;
    } catch (error) {
      console.error('Error loading signature history:', error);
      return [];
    }
  },
  
  // Save user preferences
  async savePreferences(preferences) {
    try {
      if (!this.isInitialized) await this.init();
      
      await this.db.collection('preferences').doc('user_prefs').set(preferences);
      console.log('Preferences saved to Firebase');
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  },
  
  // Load user preferences
  async loadPreferences() {
    try {
      if (!this.isInitialized) await this.init();
      
      const doc = await this.db.collection('preferences').doc('user_prefs').get();
      if (doc.exists) {
        console.log('Preferences loaded from Firebase');
        return doc.data() || { theme: 'dark' };
      } else {
        console.log('No preferences found in Firebase');
        return { theme: 'dark' };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { theme: 'dark' };
    }
  }
};
