/**
 * Improved Firebase Integration Module
 * Handles all storage operations through Firebase with better handling for calendar data
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
        apiKey: "AIzaSyDbGQs4You0gE3DQB-a9jOsOm6wniTQ4PA",
        authDomain: "luminaryops.firebaseapp.com",
        databaseURL: "https://luminaryops-default-rtdb.firebaseio.com",
        projectId: "luminaryops",
        storageBucket: "luminaryops.firebasestorage.app",
        messagingSenderId: "1042887515037",
        appId: "1:1042887515037:web:57b98b9ee44c8140732d74",
        measurementId: "G-6CNGJQ7YC8"
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
  
  // Convert data to be Firestore-compatible (remove nested arrays)
  sanitizeDataForFirestore(data) {
    if (!data) return data;
    
    // Special handling for calendar events object
    if (data.events) {
      const sanitizedData = { ...data };
      const sanitizedEvents = {};
      
      // Process each date's events separately
      for (const [dateStr, eventsArray] of Object.entries(data.events)) {
        sanitizedEvents[dateStr] = JSON.stringify(eventsArray);
      }
      
      sanitizedData.events = sanitizedEvents;
      return this.sanitizeRemainingData(sanitizedData);
    }
    
    return this.sanitizeRemainingData(data);
  },
  
  // Sanitize the non-events parts of the data
  sanitizeRemainingData(data) {
    if (!data) return data;
    
    // If it's an array, process each item
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeRemainingData(item));
    }
    
    // If it's an object, process each property
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip html property as it often contains complex structures
        if (key === 'html') {
          // Store a simplified version instead
          sanitized[key] = typeof value === 'string' ? 
            'HTML content stored separately' : 'Complex content stored separately';
          continue;
        }
        
        // Handle arrays and objects
        if (Array.isArray(value)) {
          // For arrays, stringify them if they contain objects or other arrays
          if (value.some(item => typeof item === 'object' || Array.isArray(item))) {
            sanitized[key] = JSON.stringify(value);
          } else {
            sanitized[key] = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          // For objects, recursively sanitize
          sanitized[key] = this.sanitizeRemainingData(value);
        } else {
          // For primitive values, store as is
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }
    
    // Return primitive values as is
    return data;
  },
  
  // Restore data from Firestore format
  restoreDataFromFirestore(sanitizedData) {
    if (!sanitizedData) return sanitizedData;
    
    // Special handling for calendar events object
    if (sanitizedData.events) {
      const restoredData = { ...sanitizedData };
      const restoredEvents = {};
      
      // Process each date's events separately
      for (const [dateStr, eventsString] of Object.entries(sanitizedData.events)) {
        try {
          restoredEvents[dateStr] = JSON.parse(eventsString);
        } catch (e) {
          console.error(`Failed to parse events for date ${dateStr}:`, e);
          restoredEvents[dateStr] = []; // Use empty array as fallback
        }
      }
      
      restoredData.events = restoredEvents;
      return this.restoreRemainingData(restoredData);
    }
    
    return this.restoreRemainingData(sanitizedData);
  },
  
  // Restore the non-events parts of the data
  restoreRemainingData(sanitizedData) {
    if (!sanitizedData) return sanitizedData;
    
    // If it's an array, process each item
    if (Array.isArray(sanitizedData)) {
      return sanitizedData.map(item => this.restoreRemainingData(item));
    }
    
    // If it's an object, process each property
    if (typeof sanitizedData === 'object' && sanitizedData !== null) {
      const restored = { ...sanitizedData };
      
      for (const [key, value] of Object.entries(restored)) {
        // Try to parse stringified arrays and objects
        if (typeof value === 'string' && 
            (value.startsWith('[') || value.startsWith('{'))) {
          try {
            restored[key] = JSON.parse(value);
          } catch (e) {
            // If parsing fails, keep the original string
            console.log(`Failed to parse ${key}, keeping as string`);
          }
        } else if (typeof value === 'object' && value !== null) {
          // Recursively restore nested objects
          restored[key] = this.restoreRemainingData(value);
        }
      }
      
      return restored;
    }
    
    // Return primitive values as is
    return sanitizedData;
  },
  
  // Save history data (quotes and invoices)
  async saveHistory(historyData) {
    try {
      if (!this.isInitialized) await this.init();
      
      // Create a Firestore-compatible version of the data
      const sanitizedData = this.sanitizeDataForFirestore(historyData);
      
      // Store sanitized data in Firestore
      await this.db.collection('history').doc('user_data').set({ 
        data: sanitizedData,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Separately store each item's HTML content for retrieval
      for (const item of historyData) {
        if (item.html && item.id) {
          await this.db.collection('history_html').doc(item.id).set({
            html: item.html,
            itemId: item.id,
            type: item.type,
            date: item.date
          });
        }
      }
      
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
      
      // Get sanitized history data
      const doc = await this.db.collection('history').doc('user_data').get();
      let historyData = [];
      
      if (doc.exists) {
        const sanitizedData = doc.data().data || [];
        historyData = this.restoreDataFromFirestore(sanitizedData);
        
        // Load HTML content for each item
        for (const item of historyData) {
          if (item.id) {
            const htmlDoc = await this.db.collection('history_html').doc(item.id).get();
            if (htmlDoc.exists) {
              item.html = htmlDoc.data().html;
            }
          }
        }
        
        console.log('History data loaded from Firebase');
      } else {
        console.log('No history data found in Firebase');
      }
      
      return historyData;
    } catch (error) {
      console.error('Error loading history data:', error);
      return [];
    }
  },
  
  // Save calendar availability data
  async saveCalendarData(availability) {
    try {
      if (!this.isInitialized) await this.init();
      
      // Convert availability data to be Firestore-compatible
      const sanitizedAvailability = this.sanitizeDataForFirestore(availability);
      
      // Safety check - make sure events is not undefined
      if (!sanitizedAvailability.events) {
        sanitizedAvailability.events = {};
      }
      
      // Batch write for better performance with large datasets
      const batch = this.db.batch();
      
      // Store the main availability data (blockedDates and bookedDates)
      const mainRef = this.db.collection('calendar').doc('availability');
      batch.set(mainRef, {
        blockedDates: sanitizedAvailability.blockedDates || {},
        bookedDates: sanitizedAvailability.bookedDates || {}
      });
      
      // Store events separately for each month to avoid size limits
      // Group events by month
      const eventsByMonth = {};
      
      for (const [dateStr, eventData] of Object.entries(sanitizedAvailability.events)) {
        // Extract year and month from date string (YYYY-MM-DD)
        const yearMonth = dateStr.substring(0, 7); // "YYYY-MM"
        if (!eventsByMonth[yearMonth]) {
          eventsByMonth[yearMonth] = {};
        }
        eventsByMonth[yearMonth][dateStr] = eventData;
      }
      
      // Save each month's events as a separate document
      for (const [yearMonth, monthEvents] of Object.entries(eventsByMonth)) {
        const monthRef = this.db.collection('calendar').doc(`events_${yearMonth}`);
        batch.set(monthRef, { events: monthEvents });
      }
      
      // Commit all the writes
      await batch.commit();
      
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
      
      // Get the main availability document
      const mainDoc = await this.db.collection('calendar').doc('availability').get();
      
      let availability = { 
        blockedDates: {}, 
        bookedDates: {}, 
        events: {} 
      };
      
      if (mainDoc.exists) {
        // Get blockedDates and bookedDates
        const mainData = mainDoc.data();
        availability.blockedDates = mainData.blockedDates || {};
        availability.bookedDates = mainData.bookedDates || {};
        
        // Query all events documents (they start with "events_")
        const eventsQuery = await this.db.collection('calendar')
          .where(firebase.firestore.FieldPath.documentId(), '>=', 'events_')
          .where(firebase.firestore.FieldPath.documentId(), '<=', 'events_\uf8ff')
          .get();
        
        // Combine all events from different months
        eventsQuery.forEach(doc => {
          const monthEvents = doc.data().events || {};
          
          // Add each date's events to the main events object
          for (const [dateStr, eventsData] of Object.entries(monthEvents)) {
            try {
              // Parse events data if it's a string
              const parsedEvents = typeof eventsData === 'string' ? 
                JSON.parse(eventsData) : eventsData;
              
              availability.events[dateStr] = parsedEvents;
            } catch (e) {
              console.error(`Error parsing events for ${dateStr}:`, e);
            }
          }
        });
        
        // Restore from Firestore format
        availability = this.restoreDataFromFirestore(availability);
        console.log('Calendar data loaded from Firebase');
      } else {
        console.log('No calendar data found in Firebase');
      }
      
      return availability;
    } catch (error) {
      console.error('Error loading calendar data:', error);
      return { 
        blockedDates: {}, 
        bookedDates: {}, 
        events: {} 
      };
    }
  },
  
  // Save signature data
  async saveSignatureData(signatureData) {
    try {
      if (!this.isInitialized) await this.init();
      
      // Sanitize signature data to be Firestore-compatible
      const sanitizedData = this.sanitizeDataForFirestore(signatureData);
      
      // Add to signature collection
      await this.db.collection('signatures').add({
        ...sanitizedData,
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
        const data = this.restoreDataFromFirestore(doc.data());
        signatures.push({
          id: doc.id,
          ...data
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
