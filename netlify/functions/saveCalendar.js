const { MongoClient } = require('mongodb');
const jwtDecode = require('jwt-decode');

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Verify JWT token from Netlify Identity
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, userId: 'anonymous' };
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwtDecode(token);
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (decoded.exp && decoded.exp < currentTime) {
      console.log('Token expired:', decoded.exp, currentTime);
      return { isValid: false, userId: 'anonymous' };
    }
    
    return { 
      isValid: true, 
      userId: decoded.sub || decoded.user_id || 'anonymous' 
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { isValid: false, userId: 'anonymous' };
  }
}

exports.handler = async (event, context) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method Not Allowed' })
      };
    }
    
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request body' })
      };
    }
    
    // Verify authentication
    const authHeader = event.headers.authorization;
    const { isValid, userId } = verifyToken(authHeader);
    console.log('Auth validation:', isValid, userId);
    
    // Use provided userId or fallback from token or use anonymous
    const userFolder = body.userId || userId || 'anonymous';
    
    // Validate required fields
    if (!body.availability || typeof body.availability !== 'object') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'availability must be an object' })
      };
    }
    
    try {
      // Connect to MongoDB
      await client.connect();
      const database = client.db('luminaryops');
      const collection = database.collection('calendar');
      
      // Update or insert calendar data
      await collection.updateOne(
        { userId: userFolder },
        { 
          $set: { 
            userId: userFolder,
            bookedDates: body.availability.bookedDates || {},
            blockedDates: body.availability.blockedDates || {},
            lastUpdated: new Date()
          } 
        },
        { upsert: true }
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Calendar data saved successfully' })
      };
    } catch (error) {
      console.error('Error saving calendar data:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Error saving calendar data' })
      };
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error('Unexpected error in handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Unexpected error in handler' })
    };
  }
};
